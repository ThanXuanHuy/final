const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const emailService = {
    sendBookingConfirmation: async (userEmail, bookingDetails) => {
        const { stationName, bookingDate, startTime, endTime, cost, id } = bookingDetails;

        const mailOptions = {
            from: `"EV Charging System" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `🎫 Xác nhận đặt chỗ thành công - #BK${id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #1890ff; padding: 20px; text-align: center; color: white;">
                        <h1>EV Charging Confirmation</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6; color: #333;">
                        <h2>Chào bạn!</h2>
                        <p>Chúc mừng bạn đã đặt lịch sạc thành công tại hệ thống <strong>EV Charging</strong>. Dưới đây là thông tin chi tiết:</p>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Mã đặt chỗ:</strong> #BK${id}</p>
                            <p style="margin: 5px 0;"><strong>Trạm sạc:</strong> ${stationName}</p>
                            <p style="margin: 5px 0;"><strong>Ngày sạc:</strong> ${bookingDate}</p>
                            <p style="margin: 5px 0;"><strong>Thời gian:</strong> ${startTime} - ${endTime}</p>
                            <p style="margin: 5px 0;"><strong>Tổng chi phí dự kiến:</strong> <span style="color: #f5222d; font-weight: bold;">${cost.toLocaleString()} VNĐ</span></p>
                        </div>

                        <p>Vui lòng đến đúng giờ để đảm bảo quyền ưu tiên tại trụ sạc. Nếu có thay đổi, bạn có thể hủy lịch trên ứng dụng trước 30 phút.</p>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="#" style="background-color: #52c41a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">XEM CHI TIẾT LỊCH HẸN</a>
                        </div>
                    </div>
                    <div style="background-color: #f0f2f5; padding: 15px; text-align: center; font-size: 12px; color: #8c8c8c;">
                        <p>Đây là email tự động, vui lòng không trả lời. <br> &copy; 2026 EV Charging Vietnam - Energy for Future.</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Booking confirmation email sent to: ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending booking email:', error);
            return false;
        }
    },

    sendWelcomeEmail: async (userEmail, fullName) => {
        const mailOptions = {
            from: `"EV Charging System" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🌱 Chào mừng bạn đến với mạng lưới xe điện EV Charging',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #52c41a; padding: 20px; text-align: center; color: white;">
                        <h1>Chào mừng ${fullName}!</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6; color: #333;">
                        <p>Cảm ơn bạn đã gia nhập cộng đồng sử dụng năng lượng sạch <strong>EV Charging</strong>.</p>
                        <p>Với tài khoản này, bạn có thể:</p>
                        <ul>
                            <li>Tìm kiếm hàng trăm trạm sạc trên toàn quốc</li>
                            <li>Đặt trước cổng sạc để không phải chờ đợi</li>
                            <li>Theo dõi lịch sử sạc và chi phí cá nhân</li>
                            <li>Nhận các ưu đãi đặc quyền cho chủ xe điện</li>
                        </ul>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="#" style="background-color: #1890ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">KHÁM PHÁ TRẠM SẠC NGAY</a>
                        </div>
                    </div>
                    <div style="background-color: #f0f2f5; padding: 15px; text-align: center; font-size: 12px; color: #8c8c8c;">
                        <p>Đây là email tự động, vui lòng không trả lời. <br> &copy; 2026 EV Charging Vietnam - Energy for Future.</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to: ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }
};

module.exports = emailService;
