const express = require('express');
const router = express.Router();
const db = require('../db');
const { success, error, getCurrentDateTime,getFirstImageFromIntrotext } = require('../utils/utils');

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

router.get('/detail/:id', (req, res) => {
  const contentId = parseInt(req.params.id, 10);
  const type = parseInt(req.query.type, 10);

  // Kiểm tra id hợp lệ
  if (isNaN(contentId)) {
    return res.status(400).json({ error: "ID không hợp lệ" });
  }

  // Kiểm tra type hợp lệ
  if (isNaN(type)) {
    return res.status(400).json({ error: "Type không hợp lệ" });
  }

  type==0?
  db.query(
    'SELECT id, title, alias, published FROM jos_sections WHERE id = ?',
    [contentId, type],
    (err, results) => {
      if (err) return error(res, err.message);

      if (results.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy chuyên mục" });
      }

      const category = results[0];
      success(res, "Lấy chuyên mục thành công", category);
    }
  )
  :
  db.query(
    'SELECT id, title, alias, section, published FROM jos_categories WHERE id = ?',
    [contentId, type],
    (err, results) => {
      if (err) return error(res, err.message);

      if (results.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy chuyên mục" });
      }

      const category = results[0];
      success(res, "Lấy chuyên mục thành công", category);
    }
  );
});

// POST category
router.post('/', (req, res) => {
  const { title, alias, section, published } = req.body;
  const description = "";
  const params = "";
  const checked_out_time = getCurrentDateTime();
  section !==0?
  db.query(
    'INSERT INTO jos_categories (title, alias, section, published, description, checked_out_time, params) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, alias, section, published, description, checked_out_time, params],
    (err, result) => {
      if (err) return error(res, err.message);
      success(res, "Thêm chuyên mục con thành công", { id: result.insertId, ...req.body }, 200);
    }
  ):
  db.query(
    'INSERT INTO jos_sections (title, alias, published, checked_out_time, params) VALUES (?, ?, ?, ?, ?)',
    [title, alias, published, checked_out_time, params],
    (err, result) => {
      if (err) return error(res, err.message);
      success(res, "Thêm chuyên mục cha thành công", { id: result.insertId, ...req.body }, 200);
    }
  );
});

// PUT category
router.put('/:id', (req, res) => {
  const { title, alias, description, parent_id, published } = req.body;
  const params = "";
  const type = parseInt(req.query.type, 10);
  type==0?
  db.query(
    'UPDATE jos_sections SET title=?, alias=?, published=? WHERE id=?',
    [title, alias,published, req.params.id],
    (err) => {
      if (err) return error(res, err.message);
      success(res, "Cập nhật chuyên mục thành công", { id: req.params.id, ...req.body });
    }
  ):
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
  const contentId = parseInt(req.params.id, 10);
  const type = parseInt(req.query.type, 10);
  // Kiểm tra id hợp lệ
  if (isNaN(contentId)) {
    return res.status(400).json({ error: "ID không hợp lệ" });
  }

  // Kiểm tra type hợp lệ
  if (isNaN(type)) {
    return res.status(400).json({ error: "Type không hợp lệ" });
  }


  type==0?db.query('DELETE FROM jos_sections WHERE id=?', [contentId], (err) => {
    if (err) return error(res, err.message);
    success(res, "Xóa chuyên mục cha thành công");
  }):
  db.query('DELETE FROM jos_categories WHERE id=?', [contentId], (err) => {
    if (err) return error(res, err.message);
    success(res, "Xóa chuyên mục con thành công");
  });
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
    i.id,
    i.title AS content_title,
    i.alias,
    i.urls,
    i.images,
    i.state,
    i.created,
    i.catid
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

// router.get("/:alias", async (req, res) => {
//   const alias = req.params.alias;
  
//   const sql = `
//     SELECT 
//     c.id,
//     c.title AS content_title,
//     c.alias,
//     c.urls,
//     c.images,
//     c.state,
//     c.catid,
//     cat.title AS category_title,
//     cat.alias AS category_alias
//     FROM 
//       jos_content c
//     LEFT JOIN 
//       jos_categories cat ON c.catid = cat.id
//     WHERE 
//       cat.alias = ? AND c.state = 1
//     ORDER BY 
//       c.created DESC
//   `;
//   try {
//     const [results] = await db.promise().query(sql, [alias]);
    
//     if (results.length === 0) {
//       return res.status(404).json({ message: "Không có bài viết nào thuộc chuyên mục này." });
//     }

//     res.json({ Code: 200, Message: "Lấy bài viết theo alias thành công", Data: results });
//   } catch (err) {
//     console.error("Lỗi lấy bài viết theo alias:", err);
//     res.status(500).json({ message: "Lỗi server" });
//   }

  
// });
// router.get("/:alias", async (req, res) => {
//   const alias = req.params.alias;
//   const page = parseInt(req.query.page) || 1;
//   const pageSize = parseInt(req.query.pageSize) || 15;
//   const offset = (page - 1) * pageSize;
//   if (page < 1 || pageSize < 1) {
//     return res.status(400).json({ message: "Tham số page và pageSize phải là số nguyên dương." });
//   }
//   const sql = `
//     SELECT 
//       c.id,
//       c.title AS content_title,
//       c.alias,
//       c.urls,
//       c.images,
//       c.state,
//       c.catid,
//       cat.title AS category_title,
//       cat.alias AS category_alias
//     FROM 
//       jos_content c
//     LEFT JOIN 
//       jos_categories cat ON c.catid = cat.id
//     WHERE 
//       cat.alias = ? AND c.state = 1
//     ORDER BY 
//       c.created DESC
//     LIMIT ? OFFSET ?
//   `;
//   console.log(sql)
//   const countSql = `
//     SELECT COUNT(*) as total
//     FROM jos_content c
//     LEFT JOIN jos_categories cat ON c.catid = cat.id
//     WHERE cat.alias = ? AND c.state = 1
//   `;

//   try {
//     const [[{ total }]] = await db.promise().query(countSql, [alias]);
//     const [results] = await db.promise().query(sql, [alias, pageSize, offset]);

//     if (results.length === 0) {
//       return res.status(404).json({ message: "Không có bài viết nào thuộc chuyên mục này." });
//     }
//     const totalPages = Math.ceil(total / pageSize);
//     res.json({
//       Code: 200,
//       Message: "Lấy bài viết theo alias thành công",
//       Data: {
//         list: results,
//         total,
//         page,
//         pageSize,
//         totalPages,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1,
//       },
//     });
//   } catch (err) {
//     console.error("Lỗi lấy bài viết theo alias:", err);
//     res.status(500).json({ message: "Lỗi server" });
//   }
// });
router.get("/:alias", async (req, res) => {
  const alias = req.params.alias;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 15;
  const offset = (page - 1) * pageSize;

  if (page < 1 || pageSize < 1) {
    return res.status(400).json({ message: "Tham số page và pageSize phải là số nguyên dương." });
  }

  const sql = `
    SELECT 
      c.id,
      c.title AS content_title,
      c.alias,
      c.urls,
      c.images,
      c.introtext,
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
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) as total
    FROM jos_content c
    LEFT JOIN jos_categories cat ON c.catid = cat.id
    WHERE cat.alias = ? AND c.state = 1
  `;

  try {
    const [[{ total }]] = await db.promise().query(countSql, [alias]);
    if (total === 0) {
      return res.status(404).json({ message: "Không có bài viết nào thuộc chuyên mục này." });
    }

    const [results] = await db.promise().query(sql, [alias, pageSize, offset]);

    // Xử lý ảnh cho từng bài viết
    const processedResults = results.map(item => {
      if (!item.urls || item.urls.trim() === '') {
        const introImageUrl = item.urls || getFirstImageFromIntrotext(item.introtext);
        return {
          ...item,
          urls: introImageUrl || null,
        };
      }
      return item;
    });

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      Code: 200,
      Message: "Lấy bài viết theo alias thành công",
      Data: {
        list: processedResults,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Lỗi lấy bài viết theo alias:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});


module.exports = router;
