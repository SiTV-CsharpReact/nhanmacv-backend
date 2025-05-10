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
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  try {
    const [users] = await db.promise().query(
      "SELECT id, username, password, name, email, usertype FROM jos_users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }

    const user = users[0];
    const [storedHash, salt] = user.password.split(":");

    const inputHash = md5(password + salt);

    if (storedHash !== inputHash) {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    // ✅ Đăng nhập thành công
    // Có thể sinh JWT ở đây nếu cần
    return success(
      res,
    "Đăng nhập thành công",
    {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        usertype: user.usertype,
      },
    );
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    return res.status(500).json({ message: "Lỗi server nội bộ" });
  }
});

module.exports = router;
