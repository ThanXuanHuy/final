const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/analytics/personal/:userId
// Thống kê dữ liệu sạc điện cá nhân của người dùng
router.get('/personal/:userId', authenticateToken, async (req, res) => {
  try {

    const userId = parseInt(req.params.userId);

    // Validate userId
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    // Chỉ user đó hoặc admin mới được xem
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Tổng hợp thống kê
    const stats = await pool.query(`
      SELECT 
        SUM(estimated_kwh) as total_kwh,
        SUM(cost) as total_spent,
        COUNT(*) as total_sessions,
        SUM(estimated_kwh * 0.4) as co2_saved
      FROM bookings 
      WHERE user_id = $1 AND status = 'COMPLETED'
    `, [userId]);


    // Lịch sử sạc theo tháng
    const history = await pool.query(`
      SELECT 
        TO_CHAR(booking_date, 'Mon') as month,
        SUM(estimated_kwh) as kwh
      FROM bookings
      WHERE user_id = $1 AND status = 'COMPLETED'
      GROUP BY month
      ORDER BY MIN(booking_date)
    `, [userId]);


    res.json({
        summary: {
            total_kwh: stats.rows[0].total_kwh || 0,
            total_spent: stats.rows[0].total_spent || 0,
            total_sessions: stats.rows[0].total_sessions || 0,
            co2_saved: stats.rows[0].co2_saved || 0
        },
        history: history.rows
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });

  }
});
module.exports = router;