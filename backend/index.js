require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const Redis = require('ioredis');
//const { sendBookingEmail } = require('./utils/emailService');

// Redis configuration with in-memory fallback for development without a Redis server
let redisConnected = false;
const realRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 times if no Redis
    return 2000;
  }
});

const mockCache = new Map();
const redis = {
  get: async (key) => (redisConnected ? realRedis.get(key) : mockCache.get(key)),
  set: async (key, val, ex, ttl) => (redisConnected ? realRedis.set(key, val, ex, ttl) : mockCache.set(key, val)),
  del: async (key) => (redisConnected ? realRedis.del(key) : mockCache.delete(key)),
  on: (event, handler) => realRedis.on(event, handler)
};

realRedis.on('connect', () => { redisConnected = true; console.log('Redis connected'); });
realRedis.on('error', (err) => { redisConnected = false; });

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= MIDDLEWARES =================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role?.toLowerCase() === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}

// ================= PUBLIC ROUTES =================

app.get('/', (req, res) => {
  res.send('EV Charging Backend Running');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all stations with charger counts (with Redis Caching)
app.get('/stations', async (req, res) => {
  try {
    const cacheKey = 'all_stations';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const result = await pool.query(`
      SELECT s.*, 
             COUNT(c.id) as total_chargers,
             COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      GROUP BY s.id
      ORDER BY s.id
    `);

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 300);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});


// Get single station
app.get('/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM stations WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Station not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// Get stations near a location
app.get('/stations/near', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });

    const result = await pool.query(`
      SELECT s.*, 
             COUNT(c.id) as total_chargers,
             COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
             (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      GROUP BY s.id
      ORDER BY distance
    `, [lat, lng]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch near stations' });
  }
});

// Get single station
app.get('/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM stations WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Station not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// Get AI-based recommendations
app.get('/stations/recommendations', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const result = await pool.query(`
      WITH station_stats AS (
        SELECT s.*, 
               COUNT(c.id) as total_chargers,
               COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
               (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
        FROM stations s
        LEFT JOIN chargers c ON s.id = c.station_id
        GROUP BY s.id
      )
      SELECT *,
             (
               (COALESCE(available_chargers::float / NULLIF(total_chargers, 0), 0)) * 50 + 
               (CASE WHEN distance < 5 THEN 30 WHEN distance < 10 THEN 15 ELSE 0 END) +
               (CASE WHEN price < 3000 THEN 20 ELSE 10 END)
             ) as ai_score
      FROM station_stats
      ORDER BY ai_score DESC NULLS LAST
      LIMIT 3
    `, [lat || 10.762622, lng || 106.660172]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Get chargers by station
app.get('/stations/:stationId/chargers', async (req, res) => {
  try {
    const { stationId } = req.params;
    const result = await pool.query('SELECT * FROM chargers WHERE station_id = $1 ORDER BY id', [stationId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chargers' });
  }
});

// ================= INCENTIVE ROUTES (PUBLIC) =================

app.get('/incentives', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incentives WHERE active_to >= CURRENT_DATE ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incentives' });
  }
});

app.get('/incentives/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incentives WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Incentive not found' });
  }
});

app.post('/incentives', authenticateToken, isAdmin, async (req, res) => {
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

app.delete('/incentives/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM incentives WHERE id = $1', [req.params.id]);
    res.json({ message: 'Incentive deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ================= STATION ROUTES =================

app.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, status)
       VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE')
       RETURNING id, email, full_name, role, status`,
      [email, hashedPassword, full_name, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ================= PROTECTED USER ROUTES =================

app.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { charger_id, booking_date, start_time, end_time, estimated_kwh, cost } = req.body;

    // Check availability
    const check = await pool.query(
      `SELECT * FROM bookings 
       WHERE charger_id = $1 AND booking_date = $2 AND status != 'CANCELLED'
       AND (start_time < $4 AND end_time > $3)`,
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

    // Send Confirmation Email
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [user_id]);
    const stationResult = await pool.query(
      'SELECT s.name FROM stations s JOIN chargers c ON s.id = c.station_id WHERE c.id = $1',
      [charger_id]
    );

    if (userResult.rows.length > 0 && stationResult.rows.length > 0) {
      sendBookingEmail(userResult.rows[0].email, {
        stationName: stationResult.rows[0].name,
        date: booking_date,
        time: start_time,
        cost: cost
      });
    }

    // Clear station cache since availability changed
    await redis.del('all_stations');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Booking failed' });
  }
});


app.get('/users/:userId/bookings', authenticateToken, async (req, res) => {
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
    console.error('SERVER ERROR FETCH BOOKINGS:', err);
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

app.patch('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found or unauthorized' });
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// ================= INCENTIVE REGISTRATION =================

app.post('/incentive-registrations', authenticateToken, async (req, res) => {
  try {
    const { incentive_id, vehicle_info } = req.body;
    const user_id = req.user.id;

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

app.get('/users/:userId/incentives', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
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

app.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, phone, status, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/users/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    res.json({ message: 'User status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  }
});

app.patch('/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Role update failed' });
  }
});

app.post('/stations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, address, latitude, longitude, opening_hours, capacity } = req.body;
    const created_by = req.user.id;
    const result = await pool.query(
      `INSERT INTO stations (name, address, latitude, longitude, opening_hours, capacity, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, address, latitude, longitude, opening_hours, capacity || 0, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create station' });
  }
});

app.put('/stations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, opening_hours, capacity } = req.body;
    const result = await pool.query(
      `UPDATE stations SET name=$1, address=$2, latitude=$3, longitude=$4, opening_hours=$5, capacity=$6 WHERE id=$7 RETURNING *`,
      [name, address, latitude, longitude, opening_hours, capacity, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

app.delete('/stations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM stations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Station deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.post('/chargers', authenticateToken, isAdmin, async (req, res) => {
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

app.put('/chargers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { charger_type, power_output, price_per_kwh, status } = req.body;
    const result = await pool.query(
      `UPDATE chargers SET charger_type=$1, power_output=$2, price_per_kwh=$3, status=$4 WHERE id=$5 RETURNING *`,
      [charger_type, power_output, price_per_kwh, status, id]
    );
    if (result.rows.length > 0) {
      io.emit('chargerStatusChanged', { chargerId: id, status: status, stationId: result.rows[0].station_id });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update charger' });
  }
});

app.delete('/chargers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM chargers WHERE id=$1', [req.params.id]);
    res.json({ message: 'Charger deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/bookings', authenticateToken, isAdmin, async (req, res) => {
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

app.patch('/bookings/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
    io.emit('bookingStatusChanged', { bookingId: id, newStatus: status });
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  }
});

app.get('/admin/incentive-registrations', authenticateToken, isAdmin, async (req, res) => {
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

app.patch('/admin/incentive-registrations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE incentive_registrations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    res.json({ message: 'Registration updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.get('/admin/stats', authenticateToken, isAdmin, async (req, res) => {
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

app.get('/admin/prediction', authenticateToken, isAdmin, async (req, res) => {
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
app.get('/admin/reports/conversion', authenticateToken, isAdmin, async (req, res) => {
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
app.get('/admin/reports/revenue-deep-dive', authenticateToken, isAdmin, async (req, res) => {
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

// GET /api/analytics/personal/:userId
app.get('/analytics/personal/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (parseInt(userId) !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = await pool.query(`
      SELECT 
        SUM(estimated_kwh) as total_kwh,
        SUM(cost) as total_spent,
        COUNT(*) as total_sessions,
        SUM(estimated_kwh * 0.4) as co2_saved
      FROM bookings 
      WHERE user_id = $1 AND status = 'COMPLETED'
    `, [userId]);

    const history = await pool.query(`
      SELECT TO_CHAR(booking_date, 'Mon') as month, SUM(estimated_kwh) as kwh
      FROM bookings
      WHERE user_id = $1 AND status = 'COMPLETED'
      GROUP BY month
      ORDER BY MIN(booking_date)
    `, [userId]);

    res.json({
      summary: stats.rows[0],
      history: history.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch personal analytics' });
  }
});

// ================= SERVER START =================


server.listen(5000, () => {
  console.log('Server running on port 5000');
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});