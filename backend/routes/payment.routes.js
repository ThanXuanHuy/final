const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const payos = require('../utils/payos');
const { getIO } = require('../socket/socket');

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

module.exports = router;
