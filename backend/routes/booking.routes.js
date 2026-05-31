const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const redis = require('../config/redis');
const dayjs = require('dayjs');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { getIO } = require('../socket/socket');
const payos = require('../utils/payos');

const cleanupExpiredBookings = async () => {
    try {
        const result = await pool.query(`
            UPDATE bookings 
            SET status = 'EXPIRED' 
            WHERE status = 'CONFIRMED' 
              AND (booking_date + start_time::time) < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '30 minutes'
            RETURNING charger_id
        `);
        if (result.rows.length > 0) {
            const chargerIds = result.rows.map(r => r.charger_id);
            const chargers = await pool.query(
                "UPDATE chargers SET status = 'AVAILABLE' WHERE id = ANY($1) RETURNING id, station_id",
                [chargerIds]
            );
            for (const row of chargers.rows) {
                getIO().emit('chargerStatusChanged', {
                    chargerId: row.id,
                    status: 'AVAILABLE',
                    stationId: row.station_id
                });
            }
            await redis.del('all_stations');
        }
    } catch (e) {
        console.error('Error cleaning up expired bookings:', e);
    }
};

//Create Booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { charger_id, booking_date, start_time, end_time, estimated_kwh, cost } = req.body;

    // Auto-expire PENDING bookings older than 30 minutes (abandoned payments)
    await pool.query(
      `UPDATE bookings SET status = 'CANCELLED'
       WHERE status = 'PENDING'
         AND payment_status != 'PAID'
         AND created_at < NOW() - INTERVAL '30 minutes'`
    );

    const isOvernight = parseInt(end_time.split(':')[0]) <= parseInt(start_time.split(':')[0]) && end_time !== '24:00';
    const end_date = isOvernight ? dayjs(booking_date).add(1, 'day').format('YYYY-MM-DD') : booking_date;

    // Check availability (exclude CANCELLED, COMPLETED, and PENDING bookings for same user on same slot)
    const check = await pool.query(
      `SELECT * FROM bookings 
       WHERE charger_id = $1 AND status NOT IN ('CANCELLED', 'COMPLETED', 'PENDING')
       AND (booking_date + start_time::time) < ($3::date + $5::time)
       AND (COALESCE(end_date, booking_date) + end_time::time) > ($2::date + $4::time)`,
      [charger_id, booking_date, end_date, start_time, end_time]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const result = await pool.query(
      `INSERT INTO bookings (user_id, charger_id, booking_date, end_date, start_time, end_time, estimated_kwh, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, charger_id, booking_date, end_date, start_time, end_time, estimated_kwh, cost]
    );

    // Do NOT update charger status to CHARGING here, 
    // it will be updated when the admin actually starts the charging session.

    await redis.del('all_stations');

    // Create PayOS payment link
    const bookingId = result.rows[0].id;
    const YOUR_DOMAIN = 'http://localhost:5173';
    // PayOS yêu cầu amount là số nguyên (VNĐ) và description tối đa 25 ký tự
    const amountInt = Math.round(parseFloat(cost) || 20000);
    const body = {
      orderCode: Number(bookingId),
      amount: amountInt,
      description: `Thanh toan dat lich`,
      returnUrl: `${YOUR_DOMAIN}/payment-result`,
      cancelUrl: `${YOUR_DOMAIN}/payment-result`
    };

    const paymentLinkRes = await payos.paymentRequests.create(body);

    res.status(201).json({
      ...result.rows[0],
      checkoutUrl: paymentLinkRes.checkoutUrl
    });
  } catch (err) {
    console.error('Booking failed:', err?.message || err);
    res.status(500).json({ error: 'Booking failed', detail: err?.message });
  }
});

// Get Booked Slots for a charger
router.get('/charger/:chargerId/slots', async (req, res) => {
  try {
    const { chargerId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const result = await pool.query(
      `SELECT start_time, end_time, booking_date, end_date
       FROM bookings 
       WHERE charger_id = $1 AND status NOT IN ('CANCELLED', 'PENDING')
       AND (booking_date = $2 OR end_date = $2 OR (end_date IS NULL AND booking_date = $2))`,
      [chargerId, date]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booked slots' });
  }
});

//Get User Bookings
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const uid = parseInt(userId);
    const tokenUid = parseInt(req.user.id);

    await cleanupExpiredBookings();

    if (uid !== tokenUid && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to view these bookings' });
    }

    const result = await pool.query(`
      WITH RankedChargers AS (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY station_id ORDER BY id) as port_number
          FROM chargers
      )
      SELECT b.*, c.charger_type, c.price_per_kwh, s.name as station_name, s.address as station_address,
             l.start_time as actual_start, l.end_time as actual_end, l.energy_consumed as actual_kwh,
             rc.port_number
      FROM bookings b
      LEFT JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN RankedChargers rc ON c.id = rc.id
      LEFT JOIN stations s ON c.station_id = s.id
      LEFT JOIN charger_logs l ON l.booking_id = b.id
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
    const getBooking = await pool.query("SELECT status, payment_status FROM bookings WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (getBooking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    let newStatus = 'CANCELLED';
    if (getBooking.rows[0].status === 'CONFIRMED' || getBooking.rows[0].payment_status === 'PAID') {
        newStatus = 'PENDING_REFUND';
    }

    const result = await pool.query(
      "UPDATE bookings SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [newStatus, id, req.user.id]
    );

    // Return charger to AVAILABLE
    const chargerId = result.rows[0].charger_id;
    const chargerResult = await pool.query(
      "UPDATE chargers SET status = 'AVAILABLE' WHERE id = $1 RETURNING station_id",
      [chargerId]
    );

    await redis.del('all_stations');

    if (chargerResult.rows.length > 0) {
      getIO().emit('chargerStatusChanged', {
        chargerId: chargerId,
        status: 'AVAILABLE',
        stationId: chargerResult.rows[0].station_id
      });
    }

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

//Admin: Get All Bookings
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    await cleanupExpiredBookings();
    
    const result = await pool.query(`
      SELECT b.*, c.charger_type, c.price_per_kwh, s.name as station_name, u.full_name as full_name,
             l.energy_consumed as actual_kwh
      FROM bookings b
      JOIN chargers c ON b.charger_id = c.id
      JOIN stations s ON c.station_id = s.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN charger_logs l ON l.booking_id = b.id
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
    const result = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

    if (result.rows.length > 0) {
      const booking = result.rows[0];
      const chargerId = booking.charger_id;

      if (status === 'CHARGING') {
        // Log start charging
        await pool.query(
          `INSERT INTO charger_logs (booking_id, charger_id, user_id, start_time) 
           VALUES ($1, $2, $3, NOW())`,
          [id, chargerId, booking.user_id]
        );

        // Update charger status to CHARGING
        const chargerResult = await pool.query(
          "UPDATE chargers SET status = 'CHARGING' WHERE id = $1 RETURNING station_id",
          [chargerId]
        );
        if (chargerResult.rows.length > 0) {
          getIO().emit('chargerStatusChanged', {
            chargerId: chargerId,
            status: 'CHARGING',
            stationId: chargerResult.rows[0].station_id
          });
        }
      } else if (status === 'COMPLETED') {
        // Log end charging and calculate energy
        // Simulate actual energy (e.g., random variation around estimated_kwh)
        const estimated = parseFloat(booking.estimated_kwh) || 20;
        const actual = (estimated + (Math.random() * 4 - 2)).toFixed(2); // +/- 2 kWh

        await pool.query(
          `UPDATE charger_logs 
           SET end_time = NOW(), energy_consumed = $1 
           WHERE booking_id = $2 AND end_time IS NULL`,
          [actual, id]
        );
      }

      if (status === 'COMPLETED' || status === 'CANCELLED') {
        const chargerResult = await pool.query(
          "UPDATE chargers SET status = 'AVAILABLE' WHERE id = $1 RETURNING station_id",
          [chargerId]
        );
        if (chargerResult.rows.length > 0) {
          getIO().emit('chargerStatusChanged', {
            chargerId: chargerId,
            status: 'AVAILABLE',
            stationId: chargerResult.rows[0].station_id
          });
        }
      }
    }

    await redis.del('all_stations');
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  }
});

//Admin: Delete Booking
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    // Xóa logs trước nếu có để tránh lỗi foreign key
    await pool.query('DELETE FROM charger_logs WHERE booking_id = $1', [id]);

    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Nếu đang ở trạng thái có thể ảnh hưởng đến trạm (như CHARGING, PENDING, CONFIRMED)
    // thì reset lại trạng thái trạm sạc.
    const chargerId = result.rows[0].charger_id;
    const chargerResult = await pool.query(
      "UPDATE chargers SET status = 'AVAILABLE' WHERE id = $1 RETURNING station_id",
      [chargerId]
    );

    await redis.del('all_stations');

    if (chargerResult.rows.length > 0) {
      getIO().emit('chargerStatusChanged', {
        chargerId: chargerId,
        status: 'AVAILABLE',
        stationId: chargerResult.rows[0].station_id
      });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;