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
const { getIO: getCronIO } = require('./socket/socket');
const redisCron = require('./config/redis');

setInterval(async () => {
    try {
        // 1. Quá hạn 30 phút -> Hủy vé, giải phóng trụ
        const expiredResult = await pool.query(`
            UPDATE bookings 
            SET status = 'EXPIRED' 
            WHERE status = 'CONFIRMED' 
              AND (booking_date + start_time::time) < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '30 minutes'
            RETURNING charger_id
        `);
        if (expiredResult.rows.length > 0) {
            console.log(`[Cron] Đã tự động hủy ${expiredResult.rows.length} vé do quá hạn 30 phút không đến sạc.`);
            const chargerIds = expiredResult.rows.map(r => r.charger_id);
            const chargers = await pool.query(
                "UPDATE chargers SET status = 'AVAILABLE' WHERE id = ANY($1) RETURNING id, station_id",
                [chargerIds]
            );
            const io = getCronIO();
            if (io) {
                for (const row of chargers.rows) {
                    io.emit('chargerStatusChanged', {
                        chargerId: row.id,
                        status: 'AVAILABLE',
                        stationId: row.station_id
                    });
                }
            }
            await redisCron.del('all_stations');
        }

        // 2. Đến giờ sạc (trong khoảng 30 phút đầu) -> Đổi trụ sang ĐÃ ĐẶT (BOOKED)
        const bookedResult = await pool.query(`
            SELECT charger_id FROM bookings 
            WHERE status = 'CONFIRMED' 
              AND (booking_date + start_time::time) <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND (booking_date + start_time::time) >= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '30 minutes'
        `);
        if (bookedResult.rows.length > 0) {
            const chargerIds = bookedResult.rows.map(r => r.charger_id);
            const chargers = await pool.query(
                "UPDATE chargers SET status = 'BOOKED' WHERE id = ANY($1) AND status = 'AVAILABLE' RETURNING id, station_id",
                [chargerIds]
            );
            const io = getCronIO();
            if (io) {
                for (const row of chargers.rows) {
                    io.emit('chargerStatusChanged', {
                        chargerId: row.id,
                        status: 'BOOKED',
                        stationId: row.station_id
                    });
                }
            }
            if (chargers.rows.length > 0) {
                await redisCron.del('all_stations');
            }
        }
    } catch (err) {
        console.error('[Cron] Lỗi khi đồng bộ trạng thái booking/charger:', err);
    }
}, 60000); // Chạy mỗi 1 phút (60000ms)

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});