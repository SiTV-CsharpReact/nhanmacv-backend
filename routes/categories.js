const express = require('express');
const router = express.Router();
const db = require('../db');
const { success, error, getCurrentDateTime } = require('../utils/utils');

// GET all categories
router.get('/', (req, res) => {
  db.query('SELECT * FROM jos_categories', (err, results) => {
    if (err) return error(res, err.message);
    success(res, "Lấy danh sách chuyên mục thành công", results);
  });
});
router.get('/parent', (req, res) => {
  db.query('SELECT * FROM jos_sections', (err, results) => {
    if (err) return error(res, err.message);
    success(res, "Lấy danh sách chuyên mục cha thành công", results);
  });
});
router.get('/list', (req, res) => {
  db.query('SELECT * FROM jos_categories', (err, results) => {
    if (err) return error(res, err.message);
    success(res, "Lấy danh sách chuyên mục thành công", results);
  });
});

router.get('/menu', (req, res) => {
  const sql = `
  SELECT 
  s.id AS section_id,
  s.title AS section_title,
  c.id AS category_id,
  c.title AS category_title,
  c.parent_id,
  c.section,
  c.alias,
  s.alias as alias_parent
FROM jos_sections s
LEFT JOIN jos_categories c ON c.section = s.id
WHERE s.published = 1 AND (c.published = 1 OR c.published IS NULL)
ORDER BY s.ordering ASC, c.parent_id ASC, c.ordering ASC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    success(res, "Lấy danh sách chuyên mục thành công", results)
  });
});


// POST category
router.post('/', (req, res) => {
  const { title, alias, section, published } = req.body;
  const description = "";
  const params = "";
  const checked_out_time = getCurrentDateTime();

  db.query(
    'INSERT INTO jos_categories (title, alias, section, published, description, checked_out_time, params) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, alias, section, published, description, checked_out_time, params],
    (err, result) => {
      if (err) return error(res, err.message);
      success(res, "Thêm chuyên mục thành công", { id: result.insertId, ...req.body }, 201);
    }
  );
});

// PUT category
router.put('/:id', (req, res) => {
  const { title, alias, description, parent_id, published } = req.body;
  const params = "";

  db.query(
    'UPDATE jos_categories SET title=?, alias=?, description=?, parent_id=?, published=?, params=? WHERE id=?',
    [title, alias, description, parent_id, published, params, req.params.id],
    (err) => {
      if (err) return error(res, err.message);
      success(res, "Cập nhật chuyên mục thành công", { id: req.params.id, ...req.body });
    }
  );
});

// DELETE category
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM jos_categories WHERE id=?', [req.params.id], (err) => {
    if (err) return error(res, err.message);
    success(res, "Xóa chuyên mục thành công");
  });
});

// const sql = `
//   SELECT 
//     c.id,
//     c.title AS content_title,
//     c.alias,
//     c.introtext,
//     c.created,
//     c.created_by,
//     c.state,
//     c.catid,
//     cat.title AS category_title,
//     cat.alias AS category_alias
//   FROM 
//     jos_content c
//   LEFT JOIN 
//     jos_categories cat ON c.catid = cat.id
//   WHERE 
//     cat.alias = ? AND c.state = 1
//   ORDER BY 
//     c.created DESC
// `;

router.get("/:alias", async (req, res) => {
  const alias = req.params.alias;
  
  const sql = `
    SELECT 
    c.id,
    c.title AS content_title,
    c.alias,
    c.urls,
    c.images,
    c.state,
    c.catid,
    cat.title AS category_title,
    cat.alias AS category_alias
    FROM 
      jos_content c
    LEFT JOIN 
      jos_categories cat ON c.catid = cat.id
    WHERE 
      cat.alias = ? AND c.state = 1
    ORDER BY 
      c.created DESC
  `;
  try {
    const [results] = await db.promise().query(sql, [alias]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Không có bài viết nào thuộc chuyên mục này." });
    }

    res.json({ Code: 200, Message: "Lấy bài viết theo alias thành công", Data: results });
  } catch (err) {
    console.error("Lỗi lấy bài viết theo alias:", err);
    res.status(500).json({ message: "Lỗi server" });
  }

  
});

router.get('/posts-by-categories', async (req, res) => {
  try {
    let { category_ids } = req.query;

    if (!category_ids) {
      return res.status(400).json({ code: 400, message: "Thiếu tham số category_ids" });
    }

    // Chuyển chuỗi "1,2,3" thành mảng số [1,2,3]
    const categoryIdsArray = category_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (categoryIdsArray.length === 0) {
      return res.status(400).json({ code: 400, message: "Danh sách category_ids không hợp lệ" });
    }

    // Tạo chuỗi dấu hỏi (?) tương ứng số lượng phần tử để tránh SQL Injection
    const placeholders = categoryIdsArray.map(() => '?').join(',');

    const sql = `
      SELECT 
        c.id AS category_id, 
        c.title AS category_title, 
        i.*
      FROM jos_categories AS c
      JOIN jos_content AS i ON i.catid = c.id
      WHERE c.id IN (${placeholders})
        AND i.state = 1
      ORDER BY c.id, i.created DESC
    `;

    const [results] = await db.promise().query(sql, categoryIdsArray);

    return success(res, "Lấy bài viết theo danh sách chuyên mục thành công", results);
  } catch (err) {
    console.error("Lỗi lấy bài viết theo danh sách category:", err);
    return error(res, err.message);
  }});
module.exports = router;
