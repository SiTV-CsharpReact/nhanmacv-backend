const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/utils');

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Thư mục lưu file
    },
    filename: function (req, file, cb) {
        // Tạo tên file ngẫu nhiên để tránh trùng lặp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// Kiểm tra file upload có phải là ảnh không
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

/**
 * @swagger
 * /upload/image:
 *   post:
 *     summary: Upload một file ảnh
 *     description: Upload ảnh và trả về đường dẫn của ảnh
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh cần upload (hỗ trợ jpg, png, gif, etc.)
 *     responses:
 *       200:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Lỗi khi không tìm thấy file hoặc file không phải ảnh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Không tìm thấy file ảnh
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Lỗi khi xử lý file
 */
router.post('/image', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return error(res, 'Không tìm thấy file ảnh', 400);
        }
        // Trả về đường dẫn ảnh
        const imageUrl = `http://localhost:3600/uploads/${req.file.filename}`;
        success(res, 'Upload ảnh thành công', { imageUrl });
    } catch (err) {
        error(res, err.message);
    }
});

/**
 * @swagger
 * /images:
 *   get:
 *     summary: Lấy danh sách ảnh đã upload
 *     description: Trả về danh sách các ảnh đã được upload vào thư mục uploads
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                         example: 1234567890-123456789.jpg
 *                       url:
 *                         type: string
 *                         example: /uploads/1234567890-123456789.jpg
 *                       size:
 *                         type: number
 *                         example: 1024
 *                       uploadDate:
 *                         type: string
 *                         example: 2024-03-20T10:30:00.000Z
 */
router.get('/images', (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        fs.readdir(uploadsDir, (err, files) => {
            if (err) return error(res, 'Không thể đọc thư mục uploads');
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            });
            const images = imageFiles.map(filename => {
                const filePath = path.join(uploadsDir, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename: filename,
                    url: `/uploads/${filename}`,
                    size: stats.size,
                    uploadDate: stats.mtime
                };
            });
            success(res, 'Lấy danh sách ảnh thành công', images);
        });
    } catch (err) {
        error(res, err.message);
    }
});

module.exports = router;
