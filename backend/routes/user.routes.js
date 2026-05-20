const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép tải lên hình ảnh (jpeg, jpg, png, gif, webp)!'));
        }
    }
});

// GET /api/users/profile
// Lấy thông tin cá nhân của người dùng đang đăng nhập
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT id, email, full_name, phone, role, status, created_at, avatar_url, vehicle_brand, vehicle_model, vehicle_plate, battery_capacity FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/users/profile
// Cập nhật thông tin cá nhân
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            full_name, 
            phone, 
            avatar_url, 
            vehicle_brand, 
            vehicle_model, 
            vehicle_plate, 
            battery_capacity 
        } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET full_name = $1, 
                 phone = $2, 
                 avatar_url = $3, 
                 vehicle_brand = $4, 
                 vehicle_model = $5, 
                 vehicle_plate = $6, 
                 battery_capacity = $7, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $8 
             RETURNING id, email, full_name, phone, role, status, avatar_url, vehicle_brand, vehicle_model, vehicle_plate, battery_capacity`,
            [full_name, phone, avatar_url, vehicle_brand, vehicle_model, vehicle_plate, battery_capacity, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/users/change-password
// Thay đổi mật khẩu người dùng
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ mật khẩu cũ và mới' });
        }

        // Lấy thông tin user hiện tại kèm theo password_hash
        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];
        
        // Kiểm tra mật khẩu hiện tại
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
        }

        // Băm mật khẩu mới
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu mới vào database
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedNewPassword, userId]
        );

        res.json({
            message: 'Đổi mật khẩu thành công!'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// POST /api/users/upload-avatar
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng chọn hình ảnh để tải lên' });
        }
        
        // Build public URL for uploaded file
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.json({
            message: 'Tải lên hình ảnh thành công',
            avatarUrl: avatarUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Lỗi khi tải lên hình ảnh' });
    }
});

module.exports = router;

