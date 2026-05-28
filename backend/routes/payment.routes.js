const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const payos = require('../utils/payos');
const { getIO } = require('../socket/socket');
const emailService = require('../services/emailService');
const dayjs = require('dayjs');

// Lắng nghe webhook từ PayOS
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Xác thực webhook data
    const verifiedData = payos.verifyPaymentWebhookData(webhookData);

    // Nếu thanh toán thành công (code = '00')
    if (verifiedData.code === '00' || verifiedData.success === true) {
      const orderCode = verifiedData.orderCode; // Đây chính là bookingId
      
      // Cập nhật Database
      const result = await pool.query(
        `UPDATE bookings 
         SET payment_status = 'PAID', status = 'CONFIRMED' 
         WHERE id = $1 RETURNING *`,
        [orderCode]
      );

      if (result.rows.length > 0) {
        console.log(`Đơn hàng ${orderCode} đã thanh toán thành công`);
        // Emit socket để báo cho Frontend (nếu Frontend đang mở màn hình chờ)
        getIO().emit('paymentSuccess', { bookingId: orderCode });

        // Gửi email xác nhận
        pool.query(`
            SELECT b.*, u.email, s.name as station_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN chargers c ON b.charger_id = c.id
            JOIN stations s ON c.station_id = s.id
            WHERE b.id = $1
        `, [orderCode]).then(resInfo => {
          if (resInfo.rows.length > 0) {
            const info = resInfo.rows[0];
            emailService.sendBookingConfirmation(info.email, {
              id: info.id,
              stationName: info.station_name,
              bookingDate: dayjs(info.booking_date).format('DD/MM/YYYY'),
              startTime: info.start_time,
              endTime: info.end_time,
              cost: info.cost
            });
          }
        }).catch(err => console.error('Error fetching email info for webhook:', err));
      }
    }

    res.json({
      success: true,
      message: "Webhook processed"
    });
  } catch (error) {
    console.error('Lỗi webhook PayOS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/verify/:orderCode
// Dùng cho trường hợp localhost (PayOS webhook không gọi về được)
router.get('/verify/:orderCode', async (req, res) => {
  try {
    const { orderCode } = req.params;
    const paymentInfo = await payos.paymentRequests.get(String(orderCode));

    if (paymentInfo.status === 'PAID') {
      const result = await pool.query(
        `UPDATE bookings 
         SET payment_status = 'PAID', status = 'CONFIRMED' 
         WHERE id = $1 AND status = 'PENDING' RETURNING *`,
        [orderCode]
      );

      if (result.rows.length > 0) {
        console.log(`(Frontend Verify) Đơn hàng ${orderCode} đã thanh toán thành công`);
        getIO().emit('paymentSuccess', { bookingId: orderCode });

        // Gửi email xác nhận
        pool.query(`
            SELECT b.*, u.email, u.full_name, s.name as station_name, c.charger_type as port_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN chargers c ON b.charger_id = c.id
            JOIN stations s ON c.station_id = s.id
            WHERE b.id = $1
        `, [orderCode]).then(resInfo => {
          if (resInfo.rows.length > 0) {
            const info = resInfo.rows[0];
            emailService.sendBookingConfirmation(info.email, {
              id: info.id,
              stationName: info.station_name,
              bookingDate: dayjs(info.booking_date).format('DD/MM/YYYY'),
              startTime: info.start_time,
              endTime: info.end_time,
              cost: info.cost
            });
          }
        }).catch(err => console.error('Error fetching email info for verify:', err));
      }
    }
    
    // Always fetch booking info to return to frontend for the QR code
    const resInfo = await pool.query(`
        SELECT b.id, b.booking_date, b.start_time, b.end_time, b.cost, u.full_name, u.email, s.name as station_name, c.charger_type as port_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN chargers c ON b.charger_id = c.id
        JOIN stations s ON c.station_id = s.id
        WHERE b.id = $1
    `, [orderCode]);

    const bookingData = resInfo.rows.length > 0 ? resInfo.rows[0] : null;

    res.json({ success: true, status: paymentInfo.status, bookingData });
  } catch (error) {
    console.error('Lỗi verify PayOS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
