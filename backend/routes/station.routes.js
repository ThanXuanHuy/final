const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const redis = require('../config/redis');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const cacheKey = 'all_stations';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const result = await pool.query(`
      SELECT s.*, 
             COUNT(c.id) as total_chargers,
             COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
             MIN(c.price_per_kwh) as price,
             MAX(c.power_output) as max_power
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      GROUP BY s.id
      ORDER BY s.id
    `);

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 300);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Near stations
router.get('/near', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Lat and Lng required' });
    }
    const result = await pool.query(`
      SELECT s.*, 
             COUNT(c.id) as total_chargers,
             COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
             MIN(c.price_per_kwh) as price,
             MAX(c.power_output) as max_power,
             (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      GROUP BY s.id
      ORDER BY distance
      LIMIT 20
    `, [lat, lng]);
    if (result.rows.length === 0) {
        return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch near stations' });
  }
});

// Get AI-based recommendations
router.get('/recommendations', async (req,res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Lat and Lng required' });
    }
    const result = await pool.query(`
      WITH station_stats AS (
        SELECT s.*, 
            COUNT(c.id) as total_chargers,
            COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers, 
            AVG(c.price_per_kwh) as avg_price,
            (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
        FROM stations s
        LEFT JOIN chargers c ON s.id = c.station_id
        GROUP BY s.id
      )
      SELECT *,
            (
               (COALESCE(available_chargers::float / NULLIF(total_chargers, 0), 0)) * 50 + 
               (CASE WHEN avg_price < 3000 THEN 20 ELSE 10 END) + 
               (CASE WHEN distance < 5 THEN 30 WHEN distance < 10 THEN 15 ELSE 5 END)
            ) as ai_score
      FROM station_stats
      ORDER BY ai_score DESC 
      LIMIT 3
    `,[lat,lng]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

// Changer by station
router.get('/:stationId/chargers', async (req,res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    if (isNaN(stationId)) {
      return res.status(400).json({ error: 'Invalid station id' });
    }
    const result = await pool.query(`
        SELECT c.id, c.station_id, c.charger_type, c.power_output, c.price_per_kwh,
               CASE 
                   WHEN c.status IN ('MAINTENANCE', 'OFFLINE') THEN c.status
                   WHEN EXISTS (
                       SELECT 1 FROM bookings b 
                       WHERE b.charger_id = c.id 
                         AND b.status NOT IN ('CANCELLED', 'COMPLETED')
                         AND b.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                         AND b.start_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
                         AND (b.end_time > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::time OR b.end_time = '00:00:00' OR b.end_time = '24:00:00')
                   ) THEN 'CHARGING'
                   ELSE 'AVAILABLE'
               END as status
        FROM chargers c
        WHERE c.station_id = $1 
        ORDER BY c.id
    `, [stationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chargers' });
  }
});

// Get single station
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid station id' });
    }
    const result = await pool.query('SELECT * FROM stations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Station not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

//create station
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, address, latitude, longitude, opening_hours, capacity, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO stations (name, address, latitude, longitude, opening_hours, capacity, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, address, latitude, longitude, opening_hours, capacity || 0, image_url || null, req.user.id]
    );
    await redis.del('all_stations'); 
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Create station failed' });
  }
});

// Update station
router.put('/:id', authenticateToken, isAdmin, async (req,res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid station id' });
    }
    const { name, address, latitude, longitude, opening_hours, capacity, image_url } = req.body;
    const result = await pool.query(
      `UPDATE stations SET name=$1, address=$2, latitude=$3, longitude=$4, opening_hours=$5, capacity=$6, image_url=$7 WHERE id=$8 RETURNING *`,
      [name, address, latitude, longitude, opening_hours, capacity, image_url || null, id]
    );
    await redis.del('all_stations');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update station failed' });
  }
});

// Delete station
router.delete('/:id', authenticateToken, isAdmin, async (req,res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid station id' });
    }
    await pool.query('DELETE FROM stations WHERE id=$1', [id]);
    await redis.del('all_stations');
    res.json({ message: 'Station deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});
module.exports = router;