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

router.get("/", async (req, res) => {
  try {

    // Lấy filter từ query
    const filters = {
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      state: req.query.state,
      alias: req.query.alias,
      keyword: req.query.keyword,
    };

    // Build điều kiện WHERE và params cho truy vấn chính
    const { whereClause, params } = buildWhereClause(filters);

    // Thêm limit và offset vào params
    params.push(pageSize, offset);

    // Truy vấn dữ liệu với filter và phân trang
    const sql = `
    SELECT id, title, alias, introtext, created FROM slide
    ORDER BY created DESC
    LIMIT 7;
    `;

    const [results] = await db.promise().query(sql, params);
    // Lấy tổng số bản ghi phù hợp filter
    const total = await getTotalCount(db, filters);

    // Trả về response
    success(res, "Lấy danh sách bài viết thành công", {
      list: results,
      total: total,
      // pagination: { page, pageSize, total, totalPages }
    });
    console.log(res);
  } catch (err) {
    error(res, "Internal server error");
  }
});

module.exports = router;

  