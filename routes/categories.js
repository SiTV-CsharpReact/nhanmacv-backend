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

// POST category
router.post('/', (req, res) => {
  const { title, alias, parent_id, published } = req.body;
  const description = "";
  const params = "";
  const checked_out_time = getCurrentDateTime();

  db.query(
    'INSERT INTO jos_categories (title, alias, parent_id, published, description, checked_out_time, params) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, alias, parent_id, published, description, checked_out_time, params],
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

module.exports = router;
