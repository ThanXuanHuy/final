const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
// ================= INCENTIVE ROUTES (PUBLIC) =================
// Get all active incentives
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incentives WHERE active_to >= CURRENT_DATE ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incentives' });
  }
});

// Get incentive by id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid incentive id' });
    }
    const result = await pool.query('SELECT * FROM incentives WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incentive not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Incentive not found' });
  }
});

//Create incentive (admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, subsidy_amount, conditions, active_from, active_to } = req.body;
    const result = await pool.query(
      `INSERT INTO incentives (title, description, subsidy_amount, conditions, active_from, active_to)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, subsidy_amount, conditions, active_from, active_to]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create incentive' });
  }
});

//Delete incentive 
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid incentive id' });
    }
    const result = await pool.query('DELETE FROM incentives WHERE id = $1 RETURNING *',[id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incentive not found' });
    }
    res.json({ message: 'Incentive deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ================= INCENTIVE REGISTRATION =================

// Register incentive
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { incentive_id, vehicle_info } = req.body;
    const user_id = req.user.id;
    const check = await pool.query(
        'SELECT id FROM incentives WHERE id = $1',
        [incentive_id]
    );

    if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Incentive not found' });
    }
    const result = await pool.query(
      `INSERT INTO incentive_registrations (user_id, incentive_id, vehicle_info)
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, incentive_id, vehicle_info]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get user incentive registrations 
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const result = await pool.query(`
      SELECT ir.*, i.title as incentive_title, i.subsidy_amount
      FROM incentive_registrations ir
      JOIN incentives i ON ir.incentive_id = i.id
      WHERE ir.user_id = $1
      ORDER BY ir.registration_date DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user incentives' });
  }
});
module.exports = router;