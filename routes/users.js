const express = require('express');
const router = express.Router();
const md5 = require('md5');
const db = require('../db');
const { success, error } = require('../utils/utils');

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
    return error(res, 'Vui lòng nhập đầy đủ thông tin', 400);
  }

  const hashedPassword = md5(password);

  // Kiểm tra username hoặc email đã tồn tại chưa
  db.query(
    'SELECT id FROM jos_users WHERE username = ? OR email = ?',
    [username, email],
    (err, users) => {
      if (err) return error(res, err.message);

      if (users.length > 0) {
        return error(res, 'Tài khoản hoặc email đã tồn tại', 400);
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
        if (err) return error(res, err.message);
        success(res, 'Tạo tài khoản thành công', { userId: result.insertId }, 201);
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
    return error(res, 'Vui lòng nhập username và password', 400);
  }

  const hashedPassword = md5(password);

  const query = `
    SELECT id, name, username, email, usertype
    FROM jos_users
    WHERE username = ? AND password = ?
    LIMIT 1
  `;

  db.query(query, [username, hashedPassword], (err, results) => {
    if (err) return error(res, err.message);

    if (results.length === 0) {
      return error(res, 'Sai tên đăng nhập hoặc mật khẩu', 401);
    }

    success(res, 'Đăng nhập thành công', { user: results[0] });
  });
});

module.exports = router;
