
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
        db.query(
            'SELECT id, title, created, created_by FROM jos_content ORDER BY id DESC LIMIT 100',
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
    
                const postsWithImages = results
                    .filter(post => post.introtext && post.introtext.toLowerCase().includes('<img'))
                    .map(post => {
                        // Dùng regex để lấy src của ảnh đầu tiên
                        const match = post.introtext.match(/<img[^>]+src="([^">]+)"/i);
                        const image = match ? match[1] : null;
    
                        return {
                            ...post,
                            image, // thêm trường image
                        };
                    })
                    .slice(0, 4); // lấy 4 bài đầu tiên sau khi lọc
    
                res.json(postsWithImages);
            }
        );
    });

    module.exports = router;

  