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
const evModelsRoutes = require('./routes/ev_models.routes');
const paymentRoutes = require('./routes/payment.routes');
const simulatorRoutes = require('./routes/simulator.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const { initSocket } = require('./socket/socket');

const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

initSocket(server);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chargers', chargerRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ev-models', evModelsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/chatbot', chatbotRoutes);

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

// ================= CRON JOBS =================
setInterval(async () => {
    try {
        // Tự động hủy các vé đã đến giờ sạc nhưng quá 30 phút không quét QR
        const result = await pool.query(`
            UPDATE bookings 
            SET status = 'CANCELLED' 
            WHERE status = 'CONFIRMED' 
            AND (booking_date + start_time::time) < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '30 minutes'
            RETURNING id
        `);
        if (result.rows.length > 0) {
            console.log(`[Cron] Đã tự động hủy ${result.rows.length} vé do quá hạn 30 phút không đến sạc.`);
            // Tuỳ chọn: Có thể emit socket cập nhật lại lịch sạc nếu cần
        }
    } catch (err) {
        console.error('[Cron] Lỗi khi quét tự động hủy vé:', err);
    }
}, 60000); // Chạy mỗi 1 phút (60000ms)

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});