require('dotenv').config();
const express = require('express');
const cors = require('cors');

const http = require('http');
const { Server } = require('socket.io');

const pool = require('./config/db');
const { authenticateToken, isAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const stationRoutes = require('./routes/station.routes');
const bookingRoutes = require('./routes/booking.routes');
const chargerRoutes = require('./routes/chargers.routes');
const incentiveRoutes = require('./routes/incentive.routes');
const adminRoutes = require('./routes/admin.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const { initSocket } = require('./socket/socket');

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chargers', chargerRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

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

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});