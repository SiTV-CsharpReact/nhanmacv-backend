const express = require('express');
const router = express.Router();
const db = require('../db');
const moment = require('moment');
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

// Hàm build điều kiện WHERE và params tương ứng
// Hàm build điều kiện WHERE và params
function buildWhereClause({ startTime, endTime, state, alias, keyword }) {
  const conditions = [];
  const params = [];

  if (startTime && endTime) {
    // startTime, endTime dạng 'DD/MM/YYYY'
    const from = moment(startTime, 'DD/MM/YYYY').startOf('day').format('YYYY-MM-DD');
    const to = moment(endTime, 'DD/MM/YYYY').endOf('day').format('YYYY-MM-DD');
    conditions.push('DATE(created) BETWEEN ? AND ?');
    params.push(from, to);
  } else if (startTime) {
    const from = moment(startTime, 'DD/MM/YYYY').startOf('day').format('YYYY-MM-DD');
    conditions.push('DATE(created) >= ?');
    params.push(from);
  } else if (endTime) {
    const to = moment(endTime, 'DD/MM/YYYY').endOf('day').format('YYYY-MM-DD');
    conditions.push('DATE(created) <= ?');
    params.push(to);
  }

  if (state !== undefined && state !== null && state !== "") {
    conditions.push('state = ?');
    params.push(Number(state));
  }

  if (alias) {
    conditions.push('alias = ?');
    params.push(alias);
  }

  if (keyword) {
    conditions.push('title LIKE ?');
    params.push(`%${keyword}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}


// Hàm lấy tổng số bản ghi theo filter
// async function getTotalCount(db, filters) {
//   const { whereClause, params } = buildWhereClause(filters);
//   const sql = `SELECT COUNT(*) as total FROM jos_content ${whereClause}`;
//   const [[row]] = await db.promise().query(sql, params);
//   return row.total || 0;
// }

router.get('/', async (req, res) => {
 try {
    console.log(req.query)
    let page = parseInt(req.query.page, 10);
    let pageSize = parseInt(req.query.pageSize, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 10;

    const offset = (page - 1) * pageSize;

    // Lấy filter từ query
    const filters = {
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      state: req.query.state,
      alias: req.query.alias,
      keyword: req.query.keyword
    };

    // Build điều kiện WHERE và params cho truy vấn chính
    const { whereClause, params } = buildWhereClause(filters);
  
    // Thêm limit và offset vào params
    params.push(pageSize, offset);

    // Truy vấn dữ liệu với filter và phân trang
    const sql = `
      SELECT id, state, title, introtext, metakey, created, created_by, alias
      FROM jos_content
      ${whereClause}
      ORDER BY created DESC
      LIMIT ? OFFSET ?
    `;
    console.log(sql,params)
    const [results] = await db.promise().query(sql, params);
   console.log([results])
    // Xử lý ảnh và excerpt
    

    // Lấy tổng số bản ghi phù hợp filter
    const total = await getTotalCount(db, filters);

    // Trả về response
    res.json({
      data: [results],
      // pagination: {
      //   page,
      //   pageSize,
      //   total,
      //   totalPages: Math.ceil(total / pageSize)
      // }
    });
  console.log(res)
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