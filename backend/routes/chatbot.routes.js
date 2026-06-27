const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/', async (req, res) => {
    try {
        const { message, history, userLocation } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const functionDeclarations = [
            {
                name: "get_all_stations",
                description: "Lấy danh sách TẤT CẢ trạm sạc gồm tên, địa chỉ, tọa độ, giờ mở cửa, tổng trụ sạc, trụ còn trống, giá thấp nhất. Dùng khi người dùng hỏi về trạm sạc, tìm trạm, hỏi giá, hỏi chỗ trống.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "get_station_chargers",
                description: "Lấy chi tiết các trụ sạc của 1 trạm cụ thể: loại trụ (AC/DC), công suất, giá, trạng thái. Dùng khi người dùng hỏi chi tiết về trụ sạc ở 1 trạm.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        station_name: {
                            type: "STRING",
                            description: "Tên hoặc một phần tên trạm sạc cần tìm"
                        }
                    },
                    required: ["station_name"]
                },
            },
            {
                name: "get_overloaded_stations",
                description: "Lấy danh sách các trạm sạc đang bị quá tải (không còn trụ sạc trống hoặc còn rất ít). Dùng khi người dùng hỏi trạm nào đông, trạm nào quá tải, hoặc cần gợi ý sang trạm khác.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "find_nearby_stations",
                description: "Tìm các trạm sạc gần nhất theo tọa độ GPS của người dùng, sắp xếp theo khoảng cách. Dùng khi người dùng muốn tìm trạm sạc gần vị trí của họ.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        user_lat: {
                            type: "NUMBER",
                            description: "Vĩ độ vị trí người dùng (latitude)"
                        },
                        user_lng: {
                            type: "NUMBER",
                            description: "Kinh độ vị trí người dùng (longitude)"
                        }
                    },
                    required: ["user_lat", "user_lng"]
                },
            },
            {
                name: "get_directions_to_station",
                description: "Tính khoảng cách và trả về thông tin trạm sạc để chỉ đường trên bản đồ trong ứng dụng. Dùng khi người dùng muốn đến 1 trạm cụ thể, hỏi đường đi, hoặc hỏi bao xa.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        station_name: {
                            type: "STRING",
                            description: "Tên hoặc một phần tên trạm sạc cần chỉ đường"
                        },
                        user_lat: {
                            type: "NUMBER",
                            description: "Vĩ độ vị trí hiện tại của người dùng (latitude)"
                        },
                        user_lng: {
                            type: "NUMBER",
                            description: "Kinh độ vị trí hiện tại của người dùng (longitude)"
                        }
                    },
                    required: ["station_name"]
                },
            },
            {
                name: "suggest_alternative_stations",
                description: "Khi trạm sạc bị quá tải (hết trụ trống), gợi ý các trạm sạc thay thế gần đó CÓ chỗ trống. Dùng khi người dùng muốn sạc ở trạm X nhưng trạm đó hết chỗ.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        station_name: {
                            type: "STRING",
                            description: "Tên trạm sạc gốc đang bị quá tải"
                        }
                    },
                    required: ["station_name"]
                },
            },
            {
                name: "get_ev_models",
                description: "Lấy danh sách xe máy điện gồm tên, giá, quãng đường, pin, mô tả, thông số chi tiết. Dùng khi người dùng hỏi về xe điện, giá xe, so sánh xe.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "get_incentives",
                description: "Lấy danh sách các chương trình khuyến mãi, ưu đãi, trợ giá đang có hiệu lực. Dùng khi người dùng hỏi về khuyến mãi, ưu đãi, giảm giá.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "get_station_booking_stats",
                description: "Lấy thống kê đặt lịch sạc của 1 trạm: số lượt đặt, lượt hoàn thành, lượt hủy. Dùng khi người dùng hỏi trạm nào phổ biến, trạm nào hay được đặt.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        station_name: {
                            type: "STRING",
                            description: "Tên hoặc một phần tên trạm sạc"
                        }
                    },
                    required: ["station_name"]
                },
            }
        ];

        function haversineDistance(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c * 100) / 100;
        }

        const functions = {
            get_all_stations: async () => {
                const result = await pool.query(`
                    SELECT s.id, s.name, s.address, s.latitude, s.longitude, 
                           s.opening_hours, s.capacity,
                           COUNT(c.id) as total_chargers,
                           COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
                           COUNT(CASE WHEN c.status = 'IN_USE' THEN 1 END) as in_use_chargers,
                           MIN(c.price_per_kwh) as min_price,
                           MAX(c.price_per_kwh) as max_price
                    FROM stations s
                    LEFT JOIN chargers c ON s.id = c.station_id
                    GROUP BY s.id
                    ORDER BY s.name
                `);
                return result.rows.map(s => ({
                    name: s.name,
                    address: s.address,
                    opening_hours: s.opening_hours,
                    total_chargers: Number(s.total_chargers),
                    available_chargers: Number(s.available_chargers),
                    in_use_chargers: Number(s.in_use_chargers),
                    min_price: s.min_price ? `${Number(s.min_price).toLocaleString('vi-VN')} VNĐ/kWh` : 'Chưa có',
                    max_price: s.max_price ? `${Number(s.max_price).toLocaleString('vi-VN')} VNĐ/kWh` : 'Chưa có',
                    status: Number(s.available_chargers) === 0 ? '🔴 Hết chỗ' : Number(s.available_chargers) <= 1 ? '🟡 Sắp hết chỗ' : '🟢 Còn chỗ'
                }));
            },

            get_station_chargers: async ({ station_name }) => {
                const result = await pool.query(`
                    SELECT s.name as station_name, s.address, s.opening_hours,
                           c.id as charger_id, c.charger_type, c.power_output, 
                           c.price_per_kwh, c.status
                    FROM stations s
                    JOIN chargers c ON s.id = c.station_id
                    WHERE LOWER(s.name) LIKE LOWER($1)
                    ORDER BY c.id
                `, [`%${station_name}%`]);
                if (result.rows.length === 0) return { message: `Không tìm thấy trạm sạc nào tên "${station_name}"` };
                return result.rows.map(c => ({
                    station: c.station_name,
                    address: c.address,
                    charger_id: c.charger_id,
                    type: c.charger_type,
                    power: `${c.power_output} kW`,
                    price: `${Number(c.price_per_kwh).toLocaleString('vi-VN')} VNĐ/kWh`,
                    status: c.status === 'AVAILABLE' ? '🟢 Sẵn sàng' : c.status === 'IN_USE' ? '🔴 Đang sạc' : `⚪ ${c.status}`
                }));
            },

            get_overloaded_stations: async () => {
                const result = await pool.query(`
                    SELECT s.name, s.address,
                           COUNT(c.id) as total_chargers,
                           COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers
                    FROM stations s
                    LEFT JOIN chargers c ON s.id = c.station_id
                    GROUP BY s.id
                    HAVING COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) = 0
                       OR (COUNT(c.id) > 0 AND COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END)::float / COUNT(c.id) <= 0.25)
                    ORDER BY COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) ASC
                `);
                if (result.rows.length === 0) return { message: "Hiện tại không có trạm sạc nào bị quá tải." };
                return result.rows.map(s => ({
                    name: s.name,
                    address: s.address,
                    total: Number(s.total_chargers),
                    available: Number(s.available_chargers),
                    status: Number(s.available_chargers) === 0 ? '🔴 Hết chỗ hoàn toàn' : '🟡 Gần hết chỗ'
                }));
            },

            find_nearby_stations: async ({ user_lat, user_lng }) => {
                const result = await pool.query(`
                    SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.opening_hours,
                           COUNT(c.id) as total_chargers,
                           COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
                           MIN(c.price_per_kwh) as min_price
                    FROM stations s
                    LEFT JOIN chargers c ON s.id = c.station_id
                    GROUP BY s.id
                `);
                const stations = result.rows.map(s => ({
                    station_id: Number(s.id),
                    name: s.name,
                    address: s.address,
                    opening_hours: s.opening_hours,
                    available_chargers: Number(s.available_chargers),
                    total_chargers: Number(s.total_chargers),
                    min_price: s.min_price ? `${Number(s.min_price).toLocaleString('vi-VN')} VNĐ/kWh` : 'Chưa có',
                    distance_km: haversineDistance(user_lat, user_lng, parseFloat(s.latitude), parseFloat(s.longitude)),
                    navigation_action: `[XEM_BAN_DO:${s.id}]`
                }));
                stations.sort((a, b) => a.distance_km - b.distance_km);
                return stations.slice(0, 5);
            },

            get_directions_to_station: async ({ station_name, user_lat, user_lng }) => {
                const result = await pool.query(`
                    SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.opening_hours,
                           COUNT(c.id) as total_chargers,
                           COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers
                    FROM stations s
                    LEFT JOIN chargers c ON s.id = c.station_id
                    WHERE LOWER(s.name) LIKE LOWER($1)
                    GROUP BY s.id
                `, [`%${station_name}%`]);

                if (result.rows.length === 0) return { message: `Không tìm thấy trạm sạc tên "${station_name}"` };

                const station = result.rows[0];
                const info = {
                    station_id: Number(station.id),
                    name: station.name,
                    address: station.address,
                    opening_hours: station.opening_hours,
                    available_chargers: `${station.available_chargers}/${station.total_chargers} trụ còn trống`,
                    navigation_action: `[XEM_BAN_DO:${station.id}]`
                };

                if (user_lat && user_lng) {
                    info.distance_km = haversineDistance(user_lat, user_lng, parseFloat(station.latitude), parseFloat(station.longitude));
                }

                if (Number(station.available_chargers) === 0) {
                    info.warning = "⚠️ Trạm này hiện đang HẾT CHỖ. Hãy gọi suggest_alternative_stations để gợi ý trạm thay thế.";
                }

                return info;
            },

            suggest_alternative_stations: async ({ station_name }) => {
                const origin = await pool.query(`
                    SELECT s.id, s.name, s.latitude, s.longitude
                    FROM stations s
                    WHERE LOWER(s.name) LIKE LOWER($1)
                `, [`%${station_name}%`]);

                if (origin.rows.length === 0) return { message: `Không tìm thấy trạm "${station_name}"` };

                const originStation = origin.rows[0];

                const alternatives = await pool.query(`
                    SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.opening_hours,
                           COUNT(c.id) as total_chargers,
                           COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as available_chargers,
                           MIN(c.price_per_kwh) as min_price
                    FROM stations s
                    LEFT JOIN chargers c ON s.id = c.station_id
                    WHERE s.id != $1
                    GROUP BY s.id
                    HAVING COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) > 0
                `, [originStation.id]);

                const result = alternatives.rows.map(s => ({
                    name: s.name,
                    address: s.address,
                    opening_hours: s.opening_hours,
                    available_chargers: Number(s.available_chargers),
                    total_chargers: Number(s.total_chargers),
                    min_price: s.min_price ? `${Number(s.min_price).toLocaleString('vi-VN')} VNĐ/kWh` : 'Chưa có',
                    distance_km: haversineDistance(
                        parseFloat(originStation.latitude), parseFloat(originStation.longitude),
                        parseFloat(s.latitude), parseFloat(s.longitude)
                    )
                }));
                result.sort((a, b) => a.distance_km - b.distance_km);
                return {
                    original_station: originStation.name,
                    alternatives: result.slice(0, 5)
                };
            },

            get_ev_models: async () => {
                const result = await pool.query('SELECT name, description, range, battery, price, specs FROM ev_models');
                return result.rows.map(ev => ({
                    name: ev.name,
                    price: ev.price,
                    range: ev.range,
                    battery: ev.battery,
                    description: ev.description,
                    specs: ev.specs
                }));
            },

            get_incentives: async () => {
                const result = await pool.query(`
                    SELECT title, description, conditions, subsidy_amount, active_from, active_to 
                    FROM incentives 
                    WHERE active_to >= CURRENT_DATE OR active_to IS NULL
                    ORDER BY active_to DESC
                `);
                return result.rows.map(i => ({
                    title: i.title,
                    description: i.description,
                    conditions: i.conditions,
                    subsidy: Number(i.subsidy_amount) > 0 ? `${Number(i.subsidy_amount).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí',
                    valid_until: i.active_to
                }));
            },

            get_station_booking_stats: async ({ station_name }) => {
                const result = await pool.query(`
                    SELECT s.name,
                           COUNT(b.id) as total_bookings,
                           COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) as completed,
                           COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as cancelled,
                           COUNT(CASE WHEN b.status = 'CONFIRMED' THEN 1 END) as confirmed
                    FROM stations s
                    JOIN chargers c ON s.id = c.station_id
                    LEFT JOIN bookings b ON c.id = b.charger_id
                    WHERE LOWER(s.name) LIKE LOWER($1)
                    GROUP BY s.id
                `, [`%${station_name}%`]);
                if (result.rows.length === 0) return { message: `Không tìm thấy trạm "${station_name}"` };
                const s = result.rows[0];
                return {
                    station: s.name,
                    total_bookings: Number(s.total_bookings),
                    completed: Number(s.completed),
                    cancelled: Number(s.cancelled),
                    confirmed: Number(s.confirmed)
                };
            }
        };

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            tools: [{ functionDeclarations }],
            systemInstruction: `Bạn là "EV Assistant" - trợ lý ảo AI thông minh của hệ thống trạm sạc xe điện EV Charging.

TÍNH CÁCH & PHONG CÁCH:
- Thân thiện, nhiệt tình như một nhân viên tư vấn chuyên nghiệp.
- Trả lời bằng tiếng Việt tự nhiên, TUYỆT ĐỐI KHÔNG sử dụng emoji hay bất kỳ biểu tượng cảm xúc (icon) nào.
- Ngắn gọn nhưng đầy đủ, trình bày có cấu trúc rõ ràng.
- Gọi người dùng là "bạn", xưng hô là "tôi".

CÁCH HIỂU NGỮ CẢNH VÀ TRẢ LỜI:
1. Khi người dùng hỏi về trạm sạc (tìm trạm, hỏi giá, hỏi chỗ trống, địa chỉ):
   → Gọi get_all_stations hoặc get_station_chargers để lấy dữ liệu rồi trả lời.

2. Khi người dùng muốn tìm trạm gần nhất:
   → Nếu có tọa độ (userLocation): gọi find_nearby_stations.
   → Nếu KHÔNG có tọa độ: nhắc họ bấm nút "📍Gửi vị trí" bên dưới ô chat.

3. Khi người dùng muốn đến trạm sạc / hỏi đường đi / hỏi bao xa:
   → Gọi get_directions_to_station để tính khoảng cách.
   → QUAN TRỌNG: Khi trả lời, PHẢI ghi chính xác chuỗi navigation_action mà tool trả về (ví dụ: [XEM_BAN_DO:13]) vào câu trả lời. Ứng dụng sẽ tự động biến chuỗi đó thành nút bấm "Xem trên bản đồ" để mở bản đồ trong app.
   → Ví dụ câu trả lời: "Bạn có thể xem và chỉ đường tại đây nhé: [XEM_BAN_DO:13]"

4. Khi phát hiện trạm quá tải (available_chargers = 0):
   → Chủ động cảnh báo: "Trạm này hiện đang hết chỗ."
   → Ngay lập tức gọi suggest_alternative_stations để gợi ý trạm khác gần đó.

5. Khi người dùng hỏi về xe điện, giá xe, so sánh xe:
   → Gọi get_ev_models để lấy thông tin.

6. Khi người dùng hỏi khuyến mãi, ưu đãi, trợ giá:
   → Gọi get_incentives để lấy thông tin.

7. Khi người dùng hỏi trạm nào phổ biến, đông khách:
   → Gọi get_station_booking_stats.

QUY TẮC BẮT BUỘC:
- LUÔN gọi tools để lấy dữ liệu trước khi trả lời. KHÔNG BAO GIỜ tự bịa dữ liệu.
- Không nói về JSON, database, SQL, API hay bất kỳ thuật ngữ kỹ thuật nào.
- Nếu tools trả về rỗng hoặc lỗi, xin lỗi lịch sự và nói hệ thống chưa có thông tin.
- Khi liệt kê, dùng gạch đầu dòng (-) hoặc số thứ tự cho dễ đọc. TUYỆT ĐỐI KHÔNG DÙNG EMOJI.
- Khi có navigation_action từ tool, PHẢI đặt nguyên chuỗi [XEM_BAN_DO:xxx] vào câu trả lời.
- Luôn nhớ ngữ cảnh cuộc hội thoại trước đó để trả lời mạch lạc.`
        });

        let formattedHistory = history || [];
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const chat = model.startChat({
            history: formattedHistory
        });

        let enrichedMessage = message;
        if (userLocation && userLocation.lat && userLocation.lng) {
            enrichedMessage += `\n[Vị trí hiện tại của người dùng: lat=${userLocation.lat}, lng=${userLocation.lng}]`;
        }

        let result = await chat.sendMessage(enrichedMessage);

        let maxIterations = 5;
        let calls = result.response.functionCalls();
        while (calls && calls.length > 0 && maxIterations > 0) {
            maxIterations--;
            const functionResponses = [];

            for (const call of calls) {
                let apiResponse;
                try {
                    if (functions[call.name]) {
                        apiResponse = await functions[call.name](call.args || {});
                    } else {
                        apiResponse = { error: `Chức năng "${call.name}" không tồn tại` };
                    }
                } catch (err) {
                    console.error(`Function ${call.name} error:`, err.message);
                    apiResponse = { error: `Lỗi khi truy vấn: ${err.message}` };
                }

                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { data: apiResponse }
                    }
                });
            }

            result = await chat.sendMessage(functionResponses);
            calls = result.response.functionCalls();
        }

        const text = result.response.text();
        res.json({ reply: text });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Lỗi máy chủ AI. Vui lòng thử lại sau.' });
    }
});

module.exports = router;
