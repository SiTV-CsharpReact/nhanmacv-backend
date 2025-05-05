const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Lấy danh sách menu
 */
router.get('/', (req, res) => {
  const query = `
    SELECT id, name, alias, link, menutype, parent, ordering, published
    FROM job_menus
    ORDER BY parent ASC, ordering ASC`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * Thêm mới menu
 */
router.post('/add', (req, res) => {
  const { name, alias, link, menutype, parent, ordering, published } = req.body;
  if (
    !name ||
    !alias ||
    !link ||
    !menutype ||
    parent === undefined ||
    ordering === undefined ||
    published === undefined
  ) {
    return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
  }

  const sql = `
    INSERT INTO job_menus (name, alias, link, menutype, parent, ordering, published)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [name, alias, link, menutype, parent, ordering, published],
    (err, result) => {
      if (err) {
        console.error('Lỗi thêm menu:', err);
        return res.status(500).json({ message: 'Lỗi server khi thêm menu' });
      }
      res.status(201).json({ message: 'Thêm menu thành công', menuId: result.insertId });
    }
  );
});

/**
 * Sửa menu
 */
router.put('/edit/:id', (req, res) => {
  const { id } = req.params;
  const { name, alias, link, menutype, parent, ordering, published } = req.body;
  if (
    !name ||
    !alias ||
    !link ||
    !menutype ||
    parent === undefined ||
    ordering === undefined ||
    published === undefined
  ) {
    return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
  }

  const sql = `
    UPDATE job_menus
    SET name = ?, alias = ?, link = ?, menutype = ?, parent = ?, ordering = ?, published = ?
    WHERE id = ?`;

  db.query(
    sql,
    [name, alias, link, menutype, parent, ordering, published, id],
    (err, result) => {
      if (err) {
        console.error('Lỗi sửa menu:', err);
        return res.status(500).json({ message: 'Lỗi server khi sửa menu' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy menu để sửa' });
      }
      res.status(200).json({ message: 'Sửa menu thành công' });
    }
  );
});

/**
 * Xóa menu
 */
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM job_menus WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Lỗi xóa menu:', err);
      return res.status(500).json({ message: 'Lỗi server khi xóa menu' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy menu để xóa' });
    }
    res.status(200).json({ message: 'Xóa menu thành công' });
  });
});

module.exports = router;
