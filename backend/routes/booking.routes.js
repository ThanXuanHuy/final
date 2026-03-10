const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const redis = require('../config/redis');
const dayjs = require('dayjs');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');

//Create Booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { charger_id, booking_date, start_time, end_time, estimated_kwh, cost } = req.body;

    // Check availability
    const check = await pool.query(
      `SELECT * FROM bookings 
       WHERE charger_id = $1 AND booking_date = $2 AND status != 'CANCELLED'
       AND start_time < $4 AND end_time > $3`,
      [charger_id, booking_date, start_time, end_time]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const result = await pool.query(
      `INSERT INTO bookings (user_id, charger_id, booking_date, start_time, end_time, estimated_kwh, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, charger_id, booking_date, start_time, end_time, estimated_kwh, cost]
    );
    await redis.del('all_stations');

    // Send email confirmation (don't await to not block response)
    const bookingId = result.rows[0].id;
    pool.query(`
        SELECT b.*, u.email, s.name as station_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN chargers c ON b.charger_id = c.id
        JOIN stations s ON c.station_id = s.id
        WHERE b.id = $1
    `, [bookingId]).then(resInfo => {
      if (resInfo.rows.length > 0) {
        const info = resInfo.rows[0];
        emailService.sendBookingConfirmation(info.email, {
          id: info.id,
          stationName: info.station_name,
          bookingDate: dayjs(info.booking_date).format('DD/MM/YYYY'),
          startTime: info.start_time,
          endTime: info.end_time,
          cost: info.cost
        });
      }
    }).catch(err => console.error('Error fetching email info:', err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Booking failed' });
  }
});

//Get User Bookings
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const uid = parseInt(userId);
    const tokenUid = parseInt(req.user.id);

    if (uid !== tokenUid && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to view these bookings' });
    }

    const result = await pool.query(`
      SELECT b.*, c.charger_type, s.name as station_name, s.address as station_address
      FROM bookings b
      LEFT JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN stations s ON c.station_id = s.id
      WHERE b.user_id = $1 
      ORDER BY b.booking_date DESC, b.start_time DESC
    `, [uid]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

//Cancel Booking
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    const result = await pool.query(
      "UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await redis.del('all_stations');
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

//Admin: Get All Bookings
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.charger_type, s.name as station_name, u.full_name as full_name
      FROM bookings b
      JOIN chargers c ON b.charger_id = c.id
      JOIN stations s ON c.station_id = s.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.booking_date DESC, b.start_time DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch all bookings' });
  }
});

//Admin: Update Booking Status
router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    const { status } = req.body;
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
    await redis.del('all_stations');
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  }
});
module.exports = router;