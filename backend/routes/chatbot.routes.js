const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Lấy danh sách trạm sạc từ DB
        const result = await pool.query(`
            SELECT s.id, s.name, s.address, s.latitude, s.longitude, 
                   COUNT(c.id) as total_chargers,
                   COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
                   MIN(c.price_per_kwh) as price
            FROM stations s
            LEFT JOIN chargers c ON s.id = c.station_id
            GROUP BY s.id
        `);
        const stations = result.rows;

        // Cấu hình Gemini API
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        const prompt = `
Bạn là trợ lý ảo AI thông minh của hệ thống trạm sạc xe điện EV Charging.
Nhiệm vụ của bạn là hỗ trợ khách hàng tìm trạm sạc, báo giá, báo chỗ trống và tư vấn lịch sự.
Dưới đây là thông tin trạm sạc hiện tại trong hệ thống (được cập nhật theo thời gian thực):
${JSON.stringify(stations, null, 2)}

Nguyên tắc trả lời:
- Luôn thân thiện, ngắn gọn và trực tiếp vào vấn đề.
- Chỉ dựa vào dữ liệu trên để trả lời. Không bịa đặt thông tin.
- Nếu người dùng hỏi trạm sạc gần nhất, hãy tính toán sơ bộ nếu họ cung cấp địa điểm, hoặc nhắc họ dùng tính năng "Gần tôi nhất" trên bản đồ.
- Nếu người dùng hỏi một thông tin không có trong danh sách trạm sạc, hãy xin lỗi và báo là hệ thống chưa có trạm ở khu vực đó.
- Cấu trúc câu trả lời nên rõ ràng, có thể dùng dấu gạch đầu dòng để liệt kê.

Câu hỏi của khách hàng: "${message}"
        `;

        const aiResult = await model.generateContent(prompt);
        const response = await aiResult.response;
        const text = response.text();

        res.json({ reply: text });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Lỗi máy chủ AI. Vui lòng thử lại sau.' });
    }
});

module.exports = router;
