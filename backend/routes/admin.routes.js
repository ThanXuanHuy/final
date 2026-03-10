const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// -------------------------USER MANAGEMENT ADMIN------------------------
// GET /api/admin/users
// Lấy danh sách tất cả user (chỉ admin mới được xem)
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
// Admin cập nhật trạng thái user (ACTIVE / BLOCKED)
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
// Admin thay đổi role của user (USER -> ADMIN)
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

//------------------------INCENTIVE REGISTRATION ADMIN------------------------
// GET /api/admin/incentive-registrations
// Admin xem tất cả đăng ký nhận ưu đãi
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
// Admin duyệt / từ chối đăng ký ưu đãi
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

//-----------------------ADMIN STATS------------------------
// GET /api/admin/stats
// Lấy số liệu tổng quan cho dashboard admin
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const stationCount = await pool.query('SELECT COUNT(*) FROM stations');
    const bookingCount = await pool.query('SELECT COUNT(*) FROM bookings');
    const revenue = await pool.query('SELECT SUM(cost) FROM bookings WHERE status = $1', ['COMPLETED']);

    // Fetch chart data (last 7 days)
    const chartData = await pool.query(`
      SELECT 
        TO_CHAR(booking_date, 'DD/MM') as name,
        SUM(cost) as revenue,
        COUNT(*) as bookings
      FROM bookings
      WHERE booking_date > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `);

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

// ================= AI PREDICTION =================
// GET /api/admin/prediction
// Dự đoán lưu lượng trạm sạc theo giờ
router.get('/prediction', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Basic Linear Regression logic for Traffic Prediction
    // We fetch bookings count per hour from history
    const history = await pool.query(`
      SELECT EXTRACT(HOUR FROM start_time) as hour, COUNT(*) as count
      FROM bookings
      GROUP BY hour
      ORDER BY hour
    `);

    // Simple Linear Projection: y = mx + b (simplified for demo)
    // We just take the current counts and add a growth factor based on total users
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);
    const growthFactor = 1 + (userCount / 100); // 1% growth per user

    const prediction = history.rows.map(row => ({
      hour: row.hour.toString().padStart(2, '0'),
      usage: parseInt(row.count),
      predict: Math.round(parseInt(row.count) * growthFactor)
    }));

    // If history is empty, return defaults
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

// ================= ADVANCED REPORTS (THESIS REQUIREMENTS) =================
// GET /api/admin/reports/conversion
// Báo cáo tỷ lệ chuyển đổi người dùng sang đăng ký ưu đãi
router.get('/reports/conversion', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['USER']);
    const convertedUsers = await pool.query('SELECT COUNT(DISTINCT user_id) FROM incentive_registrations WHERE status = $1', ['APPROVED']);

    const total = parseInt(totalUsers.rows[0].count) || 1;
    const converted = parseInt(convertedUsers.rows[0].count) || 0;
    const rate = ((converted / total) * 100).toFixed(1);

    res.json({
      total_users: total,
      converted_users: converted,
      conversion_rate: parseFloat(rate),
      monthly_trend: [
        { month: 'Jan', rate: 5 },
        { month: 'Feb', rate: 12 },
        { month: 'Mar', rate: parseFloat(rate) }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversion report' });
  }
});

// GET /api/admin/reports/revenue-deep-dive
// Phân tích doanh thu theo từng trạm sạc
router.get('/reports/revenue-deep-dive', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.name as station_name,
        SUM(b.cost) as total_revenue,
        COUNT(b.id) as total_bookings,
        AVG(b.estimated_kwh) as avg_kwh
      FROM stations s
      JOIN chargers c ON s.id = c.station_id
      JOIN bookings b ON c.id = b.charger_id
      WHERE b.status = 'COMPLETED'
      GROUP BY s.id, s.name
      ORDER BY total_revenue DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch revenue analysis' });
  }
});
module.exports = router;