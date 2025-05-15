const express = require('express');
const router = express.Router();
const db = require('../db');
const { success, error } = require('../utils/utils');

/**
 * @swagger
 * /content:
 *   get:
 *     summary: Lấy danh sách 7 bài viết (bảng jos_content)
 *     responses:
 *       200:
 *         description: Danh sách bài viết
 */

router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id, c.title, c.alias, c.urls, c.created, c.introtext, 
        s.ordering
      FROM jos_content c
      LEFT JOIN jos_slides s ON s.article_id = c.id
      ORDER BY 
        CASE WHEN s.ordering IS NULL THEN 1 ELSE 0 END,
        s.ordering ASC,
        c.ordering ASC
      LIMIT 7
    `;

    const [results] = await db.promise().query(sql);

    const getFirstImageFromIntrotext = (introtext) => {
      if (!introtext) return null;
      const match = introtext.match(/<img[^>]+src="([^">]+)"/i);
      return match ? match[1] : null;
    };

    // Xử lý ảnh cho từng bài viết, thêm trường introImageUrl
    const processedResults = results.map(item => {
      const introImageUrl = getFirstImageFromIntrotext(item.introtext);
      return {
        ...item,
        urls: introImageUrl,
        // Nếu urls rỗng thì giữ nguyên null hoặc '', không ghi đè urls
      };
    });

    success(res, "Lấy danh sách 7 bài viết thành công", processedResults);
  } catch (err) {
    console.error(err);
    error(res, "Internal server error");
  }
});


/**
 * @swagger
 * /slides/edit/{id}:
 *   put:
 *     summary: Cập nhật bài viết theo id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của bài viết cần sửa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               alias:
 *                 type: string
 *               image_desc:
 *                 type: string
 *               urls:
 *                 type: string
 *         
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */

router.put("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const { article_id } = req.body;

  if (!id) {
    return error(res, "Thiếu id", 400);
  }

  if (!article_id) {
    return error(res, "Thiếu article_id", 400);
  }

  try {
    const sql = `
      UPDATE jos_slides SET
        article_id = ?
      WHERE ordering = ?
    `;

    const params = [article_id, id];

    const [result] = await db.promise().query(sql, params);

    if (result.affectedRows === 0) {
      return error(res, "Không tìm thấy bài viết với id này", 404);
    }

    success(res, "Cập nhật bài viết thành công");
  } catch (err) {
    console.error(err);
    error(res, "Lỗi server");
  }
});

/**
 * @swagger
 * /content/order:
 *   put:
 *     summary: Cập nhật thứ tự các bài viết
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - orderedIds
 *     responses:
 *       200:
 *         description: Cập nhật thứ tự thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.put('/order', async (req, res) => {
  const { orderedIds } = req.body;

  // Kiểm tra orderedIds phải là mảng số nguyên dương
  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.some(id => typeof id !== 'number' || id <= 0 || !Number.isInteger(id))
  ) {
    return error(res, 'Dữ liệu không hợp lệ: orderedIds phải là mảng số nguyên dương', 400);
  }

  try {
    // Cập nhật ordering theo thứ tự trong mảng, dùng article_id
    for (let i = 0; i < orderedIds.length; i++) {
      const articleId = orderedIds[i];
      await db.promise().query(
        'UPDATE jos_slides SET ordering = ? WHERE article_id = ?',
        [i + 1, articleId]
      );
    }

    success(res, 'Cập nhật thứ tự thành công');
  } catch (err) {
    console.error(err);
    error(res, 'Lỗi server');
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query; // lấy giá trị tìm kiếm từ query param 'q'

  if (!q || q.trim() === '') {
    return error(res, 'Thiếu từ khóa tìm kiếm', 400);
  }

  try {
    const sql = `
      SELECT id, title, alias, urls, created
      FROM jos_content
      WHERE title LIKE ?
      ORDER BY created DESC
      LIMIT 10
    `;

    // Dùng % để tìm kiếm gần đúng (LIKE)
    const params = [`%${q}%`];

    const [results] = await db.promise().query(sql, params);

    success(res, 'Tìm kiếm thành công', results);
  } catch (err) {
    console.error(err);
    error(res, 'Lỗi server');
  }
});

module.exports = router;
