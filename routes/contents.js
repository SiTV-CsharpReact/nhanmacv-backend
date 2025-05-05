const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @swagger
 * /content:
 *   get:
 *     summary: Lấy danh sách bài viết (bảng jos_content)
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số bài viết mỗi trang (mặc định 10, tối đa 100)
 *     responses:
 *       200:
 *         description: Danh sách bài viết có ảnh đầu tiên (nếu có)
 *       400:
 *         description: Tham số không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/', async (req, res) => {
  try {
    // Validate input
    let pageNumber = parseInt(req.query.pageNumber) || 1;
    let pageSize = parseInt(req.query.pageSize) || 10;

    if (pageNumber < 1) pageNumber = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 10;

    const offset = (pageNumber - 1) * pageSize;

    // Sử dụng async/await thay cho callback
    const [results] = await db.promise().query(
      'SELECT id, title, introtext, metakey, created, created_by FROM jos_content LIMIT ? OFFSET ?',
      [pageSize, offset]
    );

    // Xử lý ảnh
    const postsWithImages = results.map(post => {
      const match = post.introtext?.match(/<img[^>]+src="([^">]+)"/i);
      return {
        ...post,
        image: match ? match[1] : null,
        // Loại bỏ HTML tags từ introtext nếu cần
        excerpt: post.introtext?.replace(/<[^>]*>?/gm, '').substring(0, 200)
      };
    });

    res.json({
      data: postsWithImages,
      pagination: {
        page: pageNumber,
        pageSize,
        total: await getTotalCount() // Thêm tổng số bài viết
      }
    });

  } catch (err) {
    console.error('Error fetching content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /content/{id}:
 *   get:
 *     summary: Lấy chi tiết bài viết theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Chi tiết bài viết
 *       404:
 *         description: Bài viết không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', async (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const [results] = await db.promise().query(
      'SELECT id, title, introtext, metakey, created, created_by FROM jos_content WHERE id = ?',
      [contentId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching content by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /content/alias/{alias}:
 *   get:
 *     summary: Lấy bài viết theo alias
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết bài viết
 *       404:
 *         description: Bài viết không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/alias/:alias', async (req, res) => {
  try {
    const alias = req.params.alias;
    console.log(alias)
    if (!alias) {
      return res.status(400).json({ error: 'Alias is required' });
    }

    const [results] = await db.promise().query(
      'SELECT id, title, introtext, metakey, created, created_by FROM jos_content WHERE alias = ? LIMIT 1',
      [alias]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching content by alias:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hàm helper lấy tổng số bài viết
async function getTotalCount() {
  const [result] = await db.promise().query('SELECT COUNT(*) as total FROM jos_content');
  return result[0].total;
}

module.exports = router;