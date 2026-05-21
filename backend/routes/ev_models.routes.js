const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all EV models
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ev_models ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch EV models' });
  }
});

// Create EV model (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, price, range, battery, specs, description, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO ev_models (name, price, range, battery, specs, description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, price, range, battery, JSON.stringify(specs || []), description, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create EV model' });
  }
});

// Update EV model (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price, range, battery, specs, description, image_url } = req.body;
    const result = await pool.query(
      `UPDATE ev_models SET name=$1, price=$2, range=$3, battery=$4, specs=$5, description=$6, image_url=$7
       WHERE id=$8 RETURNING *`,
      [name, price, range, battery, JSON.stringify(specs || []), description, image_url, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'EV model not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update EV model' });
  }
});

// Delete EV model (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('DELETE FROM ev_models WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'EV model not found' });
    }
    res.json({ message: 'EV model deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
