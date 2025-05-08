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
function buildWhereClause({ created, state, keySearch }) {
  const conditions = [];
  const params = [];

  if (created) {
    // Giả sử created nhận dạng 'DD/MM/YYYY', chuyển sang 'YYYY-MM-DD'
    const formattedDate = moment(created, 'DD/MM/YYYY').format('YYYY-MM-DD');
    conditions.push('DATE(created) = ?');
    params.push(formattedDate);
  }

  if (state) {
    conditions.push('state = ?');
    params.push(state);
  }

  if (keySearch) {
    conditions.push('title LIKE ?');
    params.push(`%${keySearch}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

// Hàm lấy tổng số bản ghi theo filter
async function getTotalCount(db, filters) {
  const { whereClause, params } = buildWhereClause(filters);
  const sql = `SELECT COUNT(*) as total FROM jos_content ${whereClause}`;
  const [[row]] = await db.promise().query(sql, params);
  return row.total || 0;
}

router.get('/', async (req, res) => {
  try {
    console.log(req)
    // Parse và validate input
    let pageNumber = parseInt(req.query.pageNumber, 10);
    let pageSize = parseInt(req.query.pageSize, 10);
    if (isNaN(pageNumber) || pageNumber < 1) pageNumber = 1;
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 10;

    const offset = (pageNumber - 1) * pageSize;

    // Lấy filter từ query
    const filters = {
      created: req.query.created,
      state: req.query.state,
      keySearch: req.query.keySearch
    };

    // Build điều kiện WHERE và params cho truy vấn chính
    const { whereClause, params } = buildWhereClause(filters);
    console.log(whereClause,params)
    // Thêm limit và offset vào params
    params.push(pageSize, offset);

    // Truy vấn dữ liệu với filter và phân trang
    const sql = `
      SELECT id, state, title, introtext, metakey, created, created_by
      FROM jos_content
      ${whereClause}
      ORDER BY created DESC
      LIMIT ? OFFSET ?
    `;

    const [results] = await db.promise().query(sql, params);

    // Xử lý ảnh và excerpt
    const postsWithImages = results.map(post => {
      const match = post.introtext?.match(/<img[^>]+src="([^">]+)"/i);
      return {
        ...post,
        image: match ? match[1] : null,
        excerpt: post.introtext?.replace(/<[^>]*>?/gm, '').substring(0, 200)
      };
    });

    // Lấy tổng số bản ghi phù hợp filter
    const total = await getTotalCount(db, filters);

    // Trả về response
    res.json({
      data: postsWithImages,
      pagination: {
        page: pageNumber,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (err) {
    console.error('Error fetching content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /content:
 *   post:
 *     summary: Thêm bài viết mới vào bảng jos_content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fulltext: { type: string }
 *               state: { type: integer }
 *               sectionid: { type: integer }
 *               mask: { type: integer }
 *               catid: { type: integer }
 *               created: { type: string, format: date-time }
 *               created_by: { type: integer }
 *               created_by_alias: { type: string }
 *               modified: { type: string, format: date-time }
 *               modified_by: { type: integer }
 *               checked_out: { type: integer }
 *               checked_out_time: { type: string, format: date-time }
 *               publish_up: { type: string, format: date-time }
 *               publish_down: { type: string, format: date-time }
 *               images: { type: string }
 *               urls: { type: string }
 *               attribs: { type: string }
 *               version: { type: integer }
 *               parentid: { type: integer }
 *               ordering: { type: integer }
 *               metakey: { type: string }
 *               metadesc: { type: string }
 *               access: { type: integer }
 *               hits: { type: integer }
 *               metadata: { type: string }
 *     responses:
 *       200:
 *         description: Thêm bài viết thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/', async (req, res) => {
  try {
    const {
      fulltext, state, sectionid, mask, catid, created, created_by, created_by_alias,
      modified, modified_by, checked_out, checked_out_time, publish_up, publish_down,
      images, urls, attribs, version, parentid, ordering, metakey, metadesc, access, hits, metadata
    } = req.body;

    // Validate cơ bản (bạn có thể bổ sung thêm)
    if (!catid || !state || !created) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (catid, state, created)' });
    }

    const sql = `
      INSERT INTO jos_content (
        fulltext, state, sectionid, mask, catid, created, created_by, created_by_alias,
        modified, modified_by, checked_out, checked_out_time, publish_up, publish_down,
        images, urls, attribs, version, parentid, ordering, metakey, metadesc, access, hits, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      fulltext || '', state, sectionid || 0, mask || 0, catid, created, created_by || 0, created_by_alias || '',
      modified || null, modified_by || 0, checked_out || 0, checked_out_time || null, publish_up || null, publish_down || null,
      images || '', urls || '', attribs || '', version || 1, parentid || 0, ordering || 0, metakey || '', metadesc || '', access || 0, hits || 0, metadata || ''
    ];

    const [result] = await db.promise().query(sql, params);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error adding content:', err);
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