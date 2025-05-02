const express = require('express');
const router = express.Router();
const md5 = require('md5');
const db = require('../db');

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Tạo tài khoản người dùng mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc tài khoản đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/register', (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  const hashedPassword = md5(password);

  // Kiểm tra username hoặc email đã tồn tại chưa
  db.query(
    'SELECT id FROM jos_users WHERE username = ? OR email = ?',
    [username, email],
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });

      if (users.length > 0) {
        return res.status(400).json({ message: 'Tài khoản hoặc email đã tồn tại' });
      }

      const newUser = {
        name,
        username,
        email,
        password: hashedPassword,
        usertype: 'Registered',
        block: 0,
        sendEmail: 0,
        gid: 18, // Gid mặc định Registered
        registerDate: new Date(),
        params: ''
      };

      db.query('INSERT INTO jos_users SET ?', newUser, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Tạo tài khoản thành công', userId: result.insertId });
      });
    }
  );
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Đăng nhập hệ thống
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Sai thông tin đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập username và password' });
  }

  const hashedPassword = md5(password);

  const query = `
    SELECT id, name, username, email, usertype
    FROM jos_users
    WHERE username = ? AND password = ?
    LIMIT 1
  `;

  db.query(query, [username, hashedPassword], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user: results[0]
    });
  });
});

module.exports = router;
