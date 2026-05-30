const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const redis = require('../config/redis');
const dayjs = require('dayjs');
const { getIO } = require('../socket/socket');
const payos = require('../utils/payos');

// 1. Scan QR and verify
router.post('/scan', async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Mã QR không hợp lệ' });
    }

    const result = await pool.query(`
      WITH RankedChargers AS (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY station_id ORDER BY id) as port_number
          FROM chargers
      )
      SELECT b.*, c.power_output, c.price_per_kwh, u.full_name, s.name as station_name, rc.port_number
      FROM bookings b
      JOIN chargers c ON b.charger_id = c.id
      JOIN RankedChargers rc ON c.id = rc.id
      JOIN stations s ON c.station_id = s.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy vé đặt chỗ cho trụ này' });
    }

    const booking = result.rows[0];

    if (booking.status === 'CANCELLED' || (booking.status === 'PENDING_REFUND' && booking.actual_kwh == null)) {
      return res.status(400).json({ error: 'Vé này bạn đã hủy xin mời dùng vé khác' });
    }

    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Không tìm thấy vé đặt chỗ hợp lệ' });
    }

    // Check time validity
    const now = dayjs();
    const startDateTime = dayjs(`${dayjs(booking.booking_date).format('YYYY-MM-DD')} ${booking.start_time}`, 'YYYY-MM-DD HH:mm:ss');
    let endDateTime = dayjs(`${dayjs(booking.booking_date).format('YYYY-MM-DD')} ${booking.end_time}`, 'YYYY-MM-DD HH:mm:ss');
    
    if (booking.end_time === '24:00:00' || booking.end_time === '00:00:00') {
      endDateTime = dayjs(booking.booking_date).add(1, 'day').startOf('day');
    }

    if (now.isBefore(startDateTime)) {
      return res.status(400).json({ error: `Chưa đến giờ sạc. Vui lòng quay lại sau ${startDateTime.format('HH:mm DD/MM')}.` });
    }

    // Nếu đến trễ quá 30 phút kể từ thời gian bắt đầu, tự động hủy lượt đặt
    if (now.diff(startDateTime, 'minute') > 30) {
      await pool.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [bookingId]);
      
      // Thông báo cho frontend cập nhật trạng thái
      const cancelledBooking = { ...booking, status: 'CANCELLED' };
      getIO().emit('bookingUpdated', cancelledBooking);
      
      return res.status(400).json({ error: 'Lượt sạc đã bị tự động hủy do bạn đến trễ quá 30 phút.' });
    }

    if (now.isAfter(endDateTime)) {
      return res.status(400).json({ error: 'Vé đã hết hạn thời gian sạc.' });
    }

    res.json({
      message: 'Xác thực thành công',
      booking: booking
    });

  } catch (err) {
    console.error('Lỗi scan QR:', err);
    res.status(500).json({ error: 'Lỗi server khi quét mã' });
  }
});

// 2. Start Charging
router.post('/start', async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    // Update booking status
    const result = await pool.query(
      "UPDATE bookings SET status = 'CHARGING' WHERE id = $1 AND status = 'CONFIRMED' RETURNING *",
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Vé không hợp lệ hoặc đã bắt đầu sạc' });
    }

    const booking = result.rows[0];
    const chargerId = booking.charger_id;

    // Log start charging
    await pool.query(
      `INSERT INTO charger_logs (booking_id, charger_id, user_id, start_time) 
       VALUES ($1, $2, $3, NOW())`,
      [bookingId, chargerId, booking.user_id]
    );

    // Update charger status to CHARGING
    const chargerResult = await pool.query(
      "UPDATE chargers SET status = 'CHARGING' WHERE id = $1 RETURNING station_id",
      [chargerId]
    );

    if (chargerResult.rows.length > 0) {
      getIO().emit('chargerStatusChanged', {
        chargerId: chargerId,
        status: 'CHARGING',
        stationId: chargerResult.rows[0].station_id
      });
    }

    getIO().emit('bookingUpdated', booking);
    await redis.del('all_stations');

    res.json({ message: 'Bắt đầu sạc thành công', booking });
  } catch (err) {
    console.error('Lỗi start charging:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 3. Stop Charging
router.post('/stop', async (req, res) => {
  try {
    const { bookingId } = req.body;

    const bookingCheck = await pool.query(`
      SELECT b.*, c.power_output, c.price_per_kwh, c.station_id 
      FROM bookings b
      JOIN chargers c ON b.charger_id = c.id
      JOIN stations s ON c.station_id = s.id
      WHERE b.id = $1 AND b.status = 'CHARGING'`, 
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Vé không ở trạng thái Đang sạc' });
    }

    const booking = bookingCheck.rows[0];
    const chargerId = booking.charger_id;

    // Lấy thời gian bắt đầu thực tế
    const logCheck = await pool.query("SELECT * FROM charger_logs WHERE booking_id = $1 AND end_time IS NULL", [bookingId]);
    if (logCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy log sạc' });
    }
    
    let startTime = dayjs(logCheck.rows[0].start_time);
    const endTime = dayjs();
    
    // Sửa lỗi sai lệch múi giờ giữa DB và Nodejs (chênh lệch 7 tiếng nếu DB là UTC và Node tự đổi)
    if (endTime.diff(startTime, 'hour') >= 6 && endTime.diff(startTime, 'hour') < 24) {
        startTime = startTime.add(7, 'hour');
    }
    
    // Tính số phút đã sạc (ít nhất 1 phút)
    let minutesElapsed = endTime.diff(startTime, 'minute');
    if (minutesElapsed < 1) minutesElapsed = 1;

    // Giả sử xe nhận 80% công suất thực tế của trụ
    const effectivePower = (parseFloat(booking.power_output) || 7.4) * 0.8;
    const hoursElapsed = minutesElapsed / 60;
    const actualKwh = (effectivePower * hoursElapsed).toFixed(2);
    
    // Tiền sạc điện năng
    const electricityCost = Math.round(actualKwh * parseFloat(booking.price_per_kwh));
    
    // Tiền cọc khách đã thanh toán lúc đặt lịch (booking.cost)
    const depositPaid = Number(booking.cost);
    
    // Phí dịch vụ cố định (20,000đ)
    const fixedBookingFee = 20000;
    
    // Tổng số tiền khách phải thanh toán (Phí dịch vụ + Tiền điện)
    const totalDue = fixedBookingFee + electricityCost;
    
    // Số tiền thừa / thiếu
    const difference = totalDue - depositPaid; // Dương là thiếu (phải trả thêm), Âm là thừa (được hoàn lại)

    // Update log
    await pool.query(
      `UPDATE charger_logs 
       SET end_time = NOW(), energy_consumed = $1 
       WHERE booking_id = $2 AND end_time IS NULL`,
      [actualKwh, bookingId]
    );

    // Update booking
    const nextStatus = difference > 0 ? 'PENDING_PAYMENT' : (difference < 0 ? 'PENDING_REFUND' : 'COMPLETED');
    const updatedBooking = await pool.query(
      "UPDATE bookings SET status = $1, cost = cost + $2 WHERE id = $3 RETURNING *",
      [nextStatus, difference > 0 ? difference : 0, bookingId]
    );

    // Update charger status to AVAILABLE
    await pool.query("UPDATE chargers SET status = 'AVAILABLE' WHERE id = $1", [chargerId]);

    // Create PayOS link if difference > 0
    let checkoutUrl = null;
    let qrCodeStr = null;
    if (difference > 0) {
      try {
        const random4 = Math.floor(1000 + Math.random() * 9000).toString();
        const orderCode = Number('98' + bookingId + random4);
        const body = {
          orderCode: orderCode,
          amount: Math.round(difference),
          description: `Phi phat sinh sạc`,
          returnUrl: `http://localhost:5173/simulator`,
          cancelUrl: `http://localhost:5173/simulator`
        };
        const paymentLinkRes = await payos.paymentRequests.create(body);
        checkoutUrl = paymentLinkRes.checkoutUrl;
        qrCodeStr = paymentLinkRes.qrCode;
      } catch (err) {
        console.error('Failed to create PayOS link for extra fee:', err);
      }
    }

    getIO().emit('chargerStatusChanged', {
      chargerId: chargerId,
      status: 'AVAILABLE',
      stationId: booking.station_id
    });
    getIO().emit('bookingUpdated', updatedBooking.rows[0]);
    await redis.del('all_stations');

    res.json({ 
      message: 'Ngắt sạc thành công', 
      booking: updatedBooking.rows[0],
      billing: {
        timeElapsed: minutesElapsed,
        kwh: actualKwh,
        electricityCost: electricityCost,
        depositPaid: depositPaid,
        fixedBookingFee: fixedBookingFee,
        totalDue: totalDue,
        difference: difference,
        checkoutUrl: checkoutUrl,
        qrCode: qrCodeStr,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

  } catch (err) {
    console.error('Lỗi stop charging:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
