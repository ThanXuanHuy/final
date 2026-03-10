const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { getIO } = require('../socket/socket');

// Create charger
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { station_id, charger_type, power_output, price_per_kwh, status } = req.body;
    const result = await pool.query(
      `INSERT INTO chargers (station_id, charger_type, power_output, price_per_kwh, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [station_id, charger_type, power_output, price_per_kwh, status || 'AVAILABLE']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create charger' });
  }
});

// Update charger
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid charger id' });
    }
    const { charger_type, power_output, price_per_kwh, status } = req.body;
    const result = await pool.query(
      `UPDATE chargers SET charger_type=$1, power_output=$2, price_per_kwh=$3, status=$4 WHERE id=$5 RETURNING *`,
      [charger_type, power_output, price_per_kwh, status, id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Charger not found' });
    }
    getIO().emit('chargerStatusChanged', { chargerId: id, status: status, stationId: result.rows[0].station_id });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update charger' });
  }
});

// Delete charger
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid charger id' });
    }
    const result = await pool.query('DELETE FROM chargers WHERE id=$1 RETURNING *',[id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Charger not found' });
    }
    res.json({ message: 'Charger deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});
module.exports = router;