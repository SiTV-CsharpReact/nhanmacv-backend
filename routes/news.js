
    const express = require('express');
    const router = express.Router();
    const db = require('../db');

    /**
    /** @swagger
     * /content:
     *   get:
     *     summary: Lấy danh sách bài viết (bảng jos_content)
     *     responses:
     *       200:
     *         description: Danh sách bài viết
     */


    router.get('/top-posts', (req, res) => {
        db.query('SELECT id, title, introtext, created, created_by FROM jos_content ORDER BY id DESC LIMIT 4', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    module.exports = router;

  