# 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án EV Charging

Chào mừng bạn đến với dự án EV Charging (Hệ thống quản lý sạc xe điện). Hướng dẫn này sẽ giúp bạn hiểu cấu trúc dự án, cách cài đặt dependencies, và các lệnh để chạy cũng như build hệ thống.

## 🏗️ Cấu trúc dự án
Dự án bao gồm 2 phần chính:
- **`backend`**: Máy chủ Node.js/Express cung cấp API, Socket.IO và kết nối cơ sở dữ liệu PostgreSQL & Redis.
- **`frontend`**: Giao diện người dùng được xây dựng bằng React, Vite, và Ant Design.

---

## 💻 Yêu cầu hệ thống
Để chạy được dự án, máy tính của bạn cần cài đặt:
- Node.js >= 18.x
- npm >= 8.x (hoặc yarn)
- PostgreSQL (Database)
- Redis (In-memory caching/session)

---

## 🛠️ Cài đặt (Installation)

Sau khi clone code về máy, bạn cần cài đặt dependencies cho cả 2 phần của dự án.

### 1. Cài đặt cho Backend
```bash
cd backend
npm install
```
*Lưu ý: Bạn cần cấu hình các thông số kết nối Database, Redis, JWT, v.v. trong file `.env` (dựa trên `.env.example` nếu có).*

### 2. Cài đặt cho Frontend
```bash
cd frontend
npm install
```
*Tương tự, cấu hình file `.env` trong thư mục `frontend` (URL kết nối đến Backend).*

---

## 🚀 Chạy Development (Môi trường phát triển)

### 1. Chạy Backend
Mở một terminal, di chuyển vào thư mục `backend` và chạy server:
```bash
cd backend
node index.js
```
*(Bạn cũng có thể cài đặt `nodemon` để tự động restart server mỗi khi sửa code: `npx nodemon index.js`)*

### 2. Chạy Frontend
Mở một terminal mới, di chuyển vào thư mục `frontend` và chạy:
```bash
cd frontend
npm run dev
```
Hệ thống frontend mặc định sẽ chạy tại: `http://localhost:5173` (hoặc cổng khác do Vite cấp).

---

## 🔨 Build Production

### Build Frontend
Để chuẩn bị code frontend cho môi trường production:
```bash
cd frontend
npm run build
```
*(File build sẽ được tạo trong thư mục `frontend/dist/`)*. Bạn có thể sử dụng Nginx, Apache hoặc host các file static này trên các dịch vụ như Vercel, Netlify.

---

## 🧹 Dọn dẹp Cache & Build
Nếu bạn muốn xóa các file cài đặt / build để làm mới lại môi trường:
```bash
# Xóa thư viện và build cũ của frontend
cd frontend
rm -rf dist node_modules package-lock.json
npm install

# Xóa thư viện của backend
cd ../backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📂 Cấu trúc thư mục chi tiết

```text
Final 1/
├── backend/                # Máy chủ Backend (Node.js/Express)
│   ├── config/             # Cấu hình kết nối (db.js, redis.js...)
│   ├── middleware/         # Middleware xử lý request (auth.js...)
│   ├── routes/             # Định nghĩa các API endpoints
│   │   ├── admin.routes.js     # API cho quản trị viên
│   │   ├── auth.routes.js      # API xác thực người dùng
│   │   ├── booking.routes.js   # API đặt lịch sạc
│   │   ├── payment.routes.js   # API tích hợp thanh toán
│   │   └── ...                 # Các route khác (station, user, chatbot...)
│   ├── services/           # Xử lý logic nghiệp vụ (emailService.js...)
│   ├── socket/             # Xử lý kết nối realtime bằng Socket.IO
│   ├── uploads/            # Thư mục lưu trữ file upload (ảnh...)
│   ├── utils/              # Các tiện ích dùng chung (payos.js...)
│   ├── .env                # Biến môi trường Backend
│   ├── index.js            # File khởi chạy server chính
│   └── package.json        # Quản lý thư viện backend
│
└── frontend/               # Giao diện người dùng (React/Vite)
    ├── src/                # Mã nguồn chính
    │   ├── api/            # Cấu hình gọi API đến backend (Axios...)
    │   ├── components/     # Các component dùng chung (ChatbotWidget.jsx, ProtectedRoute.jsx...)
    │   ├── layouts/        # Layout của các trang (Sidebar, Header...)
    │   ├── pages/          # Các trang giao diện chính
    │   │   ├── admin/      # Trang dành cho Admin (Dashboard, Quản lý...)
    │   │   ├── auth/       # Trang Đăng nhập, Đăng ký
    │   │   ├── simulator/  # Trang mô phỏng (Simulator)
    │   │   └── user/       # Trang dành cho người dùng cuối (Bản đồ, Lịch sử sạc...)
    │   ├── store/          # Quản lý trạng thái toàn cục (Zustand: authStore.js...)
    │   ├── App.jsx         # Component gốc (định tuyến chính)
    │   └── main.jsx        # Điểm bắt đầu của ứng dụng React
    ├── .env                # Biến môi trường Frontend
    ├── index.html          # File HTML gốc
    ├── package.json        # Quản lý thư viện frontend
    └── vite.config.js      # Cấu hình công cụ build Vite
```

---

## 🛠️ Scripts Hữu Ích

### Frontend Scripts (`frontend/package.json`)
| Script | Mô tả |
| ------ | ----- |
| `npm run dev` | Chạy frontend ở chế độ phát triển |
| `npm run build` | Build code frontend ra file tĩnh (production) |
| `npm run preview` | Xem thử code production ở môi trường local |
| `npm run lint` | Kiểm tra lỗi cú pháp code bằng ESLint |

### Backend Scripts (`backend/package.json`)
| Script | Mô tả |
| ------ | ----- |
| `node index.js` | Khởi chạy server Backend |

---

## 📝 Ghi chú Quan Trọng
1. **Luôn đảm bảo Database (PostgreSQL) và Redis đang chạy** trước khi khởi động Backend.
2. Kiểm tra lại thông tin thanh toán (nếu có sử dụng `@payos/node` theo package.json).
3. Backend sử dụng Socket.IO cho tính năng realtime, hãy đảm bảo cổng kết nối không bị chặn (Firewall/CORS).

---

## 🐛 Troubleshooting (Xử Lý Sự Cố)

### Lỗi không kết nối được Database / Redis
- Kiểm tra xem service PostgreSQL / Redis đã được bật trên máy chưa.
- Kiểm tra lại các thông số `DB_HOST`, `DB_PORT`, `REDIS_URL`, mật khẩu trong file `backend/.env`.

### Lỗi CORS khi gọi API từ Frontend
- Đảm bảo bạn đã cấu hình middleware `cors` trong `backend/index.js` cho phép origin của frontend (thường là `http://localhost:5173`).

### Lỗi EADDRINUSE - Port đã được sử dụng
Nếu gặp lỗi `Error: listen EADDRINUSE` khi chạy Backend hoặc Frontend:
- **Trên Windows:** Tìm và tắt tiến trình đang chiếm cổng.
  ```bash
  # Ví dụ tìm cổng 5000 đang bị chiếm
  netstat -ano | findstr :5000
  
  # Tắt process (thay <PID> bằng ID tiến trình tìm được)
  taskkill /PID <PID> /F
  ```
- Hoặc thay đổi port hoạt động trong file `.env` (backend) / `vite.config.js` (frontend).
