const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/admin/users
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, phone, status, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const { role } = req.body;
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Role update failed' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    const { full_name, phone } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [full_name, phone, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Không thể xóa user vì người này đã có lịch đặt sạc' });
    } else {
      res.status(500).json({ error: 'Delete failed' });
    }
  }
});

// GET /api/admin/incentive-registrations
router.get('/incentive-registrations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ir.*, u.full_name, u.email, i.title as incentive_title
      FROM incentive_registrations ir
      JOIN users u ON ir.user_id = u.id
      JOIN incentives i ON ir.incentive_id = i.id
      ORDER BY ir.registration_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// PATCH /api/admin/incentive-registrations/:id
router.patch('/incentive-registrations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid registration id' });
    }
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE incentive_registrations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.json({ message: 'Registration updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/admin/incentive-registrations/:id
router.delete('/incentive-registrations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid registration id' });

    const result = await pool.query('DELETE FROM incentive_registrations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.json({ message: 'Registration deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const stationCount = await pool.query('SELECT COUNT(*) FROM stations');

    let bookingQuery = 'SELECT COUNT(*) FROM bookings';
    let revenueQuery = "SELECT SUM(cost) FROM bookings WHERE status = 'COMPLETED'";
    let chartQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', booking_date), 'MM/YYYY') as name,
        DATE_TRUNC('month', booking_date) as month_date,
        SUM(cost) as revenue,
        COUNT(*) as bookings
      FROM bookings
      WHERE status = 'COMPLETED'
    `;
    let chartParams = [];

    if (startDate && endDate) {
      bookingQuery += ' WHERE booking_date >= $1 AND booking_date <= $2';
      revenueQuery += ' AND booking_date >= $1 AND booking_date <= $2';
      chartQuery += ' AND booking_date >= $1 AND booking_date <= $2';
      chartParams = [startDate, endDate];
    } else {
      // Default to last 12 months if no filter
      chartQuery += " AND booking_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'";
    }

    chartQuery += `
      GROUP BY DATE_TRUNC('month', booking_date)
      ORDER BY month_date ASC
    `;

    const bookingCount = await pool.query(bookingQuery, chartParams.length ? chartParams : []);
    const revenue = await pool.query(revenueQuery, chartParams.length ? chartParams : []);
    const chartData = await pool.query(chartQuery, chartParams);

    res.json({
      users: parseInt(userCount.rows[0].count),
      stations: parseInt(stationCount.rows[0].count),
      bookings: parseInt(bookingCount.rows[0].count),
      revenue: parseFloat(revenue.rows[0].sum || 0),
      chartData: chartData.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats failed' });
  }
});

// GET /api/admin/prediction
router.get('/prediction', authenticateToken, isAdmin, async (req, res) => {
  try {
    const history = await pool.query(`
      SELECT EXTRACT(HOUR FROM start_time) as hour, COUNT(*) as count
      FROM bookings
      GROUP BY hour
      ORDER BY hour
    `);

    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);
    const growthFactor = 1 + (userCount / 100); // 1% growth per user

    const prediction = history.rows.map(row => ({
      hour: row.hour.toString().padStart(2, '0'),
      usage: parseInt(row.count),
      predict: Math.round(parseInt(row.count) * growthFactor)
    }));

    if (prediction.length === 0) {
      return res.json([
        { hour: '08', usage: 10, predict: 15 },
        { hour: '12', usage: 25, predict: 30 },
        { hour: '18', usage: 40, predict: 50 }
      ]);
    }

    res.json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Prediction failed' });
  }
});


// GET /api/admin/reports/bookings
router.get('/reports/bookings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let countQuery = 'SELECT COUNT(*) FROM bookings';
    let chartFilter = "booking_date >= DATE_TRUNC('year', CURRENT_DATE)";
    let params = [];
    
    if (startDate && endDate) {
        countQuery += " WHERE booking_date >= $1 AND booking_date <= $2";
        chartFilter = "booking_date >= $1 AND booking_date <= $2";
        params.push(startDate, endDate);
    }

    const bookingCount = await pool.query(countQuery, params);
    const chartQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', booking_date), 'MM/YYYY') as name,
        DATE_TRUNC('month', booking_date) as month_date,
        COUNT(*) as bookings
      FROM bookings
      WHERE ${chartFilter}
      GROUP BY DATE_TRUNC('month', booking_date)
      ORDER BY month_date ASC
    `;
    const chartData = await pool.query(chartQuery, params);
    res.json({
      total: parseInt(bookingCount.rows[0].count),
      chartData: chartData.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bookings report failed' });
  }
});

// GET /api/admin/reports/revenue
router.get('/reports/revenue', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let revenueQuery = "SELECT SUM(cost) FROM bookings WHERE status = 'COMPLETED'";
    let bFilter = "";
    let params = [];
    
    if (startDate && endDate) {
        revenueQuery += " AND booking_date >= $1 AND booking_date <= $2";
        bFilter = "AND b.booking_date >= $1 AND b.booking_date <= $2";
        params.push(startDate, endDate);
    }
    const revenue = await pool.query(revenueQuery, params);

    const stationsQuery = `
      SELECT 
        s.id as station_id,
        s.name as station_name,
        c.id as charger_id,
        c.charger_type,
        c.status as charger_status,
        ROW_NUMBER() OVER(PARTITION BY s.id ORDER BY c.id) as port_number,
        COUNT(b.id) as total_bookings,
        SUM(b.cost) as total_revenue
      FROM stations s
      JOIN chargers c ON s.id = c.station_id
      LEFT JOIN bookings b ON c.id = b.charger_id AND b.status = 'COMPLETED' ${bFilter}
      GROUP BY s.id, s.name, c.id, c.charger_type, c.status
      ORDER BY s.id, c.id ASC
    `;
    const stations = await pool.query(stationsQuery, params);

    res.json({
      total: parseFloat(revenue.rows[0].sum || 0),
      stations: stations.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Revenue report failed' });
  }
});



module.exports = router;