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
        SELECT id, title, alias, image_desc, urls, created, ordering
        FROM jos_slide
        ORDER BY ordering ASC, created DESC
        LIMIT 7
      `;
  
      const [results] = await db.promise().query(sql);
  
      success(res, "Lấy danh sách 7 bài viết thành công", results);
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
    const { title, alias, image_desc, urls } = req.body;
  
    if (!title) {
      return error(res, "Thiếu dữ liệu bắt buộc: title hoặc alias", 400);
    }
  
    try {
      const sql = `
        UPDATE jos_slide SET
          title = ?,
          image_desc = ?,
          urls = ?
        WHERE id = ?
      `;
  
      const params = [title, image_desc || '', urls || '', id];
  
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
  
    if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== 'number')) {
      return error(res, 'Dữ liệu không hợp lệ: orderedIds phải là mảng số', 400);
    }
  
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.promise().query('UPDATE jos_slide SET ordering = ? WHERE id = ?', [i + 1, orderedIds[i]]);
      }
      success(res, 'Cập nhật thứ tự thành công');
    } catch (err) {
      console.error(err);
      error(res, 'Lỗi server');
    }
  });
module.exports = router;
