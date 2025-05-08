const express = require('express');
const router = express.Router();
const db = require('../db');
const { success, error } = require('../utils/utils');

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
        'SELECT id, title, introtext, created, created_by FROM jos_content ORDER BY id DESC LIMIT 100',
        (err, results) => {
            if (err) return error(res, err.message);

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

            success(res, 'Lấy top 4 bài viết có ảnh thành công', postsWithImages);
        }
    );
});



module.exports = router;

  