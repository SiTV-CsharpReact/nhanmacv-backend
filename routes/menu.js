const express = require('express');
const router = express.Router();
const db = require('../db');
const { success, error } = require('../utils/utils');

/**
 * Lấy danh sách menu
 */
router.get('/', (req, res) => {
  const query = `
    SELECT id, name, alias, link, menutype, parent, ordering, published
    FROM job_menus
    ORDER BY parent ASC, ordering ASC`;

  db.query(query, (err, results) => {
    if (err) return error(res, 'Lỗi server khi lấy menu');
    success(res, 'Lấy danh sách menu thành công', results);
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
    return error(res, 'Thiếu dữ liệu bắt buộc', 400);
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
        return error(res, 'Lỗi server khi thêm menu');
      }
      success(res, 'Thêm menu thành công', { menuId: result.insertId }, 201);
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
    return error(res, 'Thiếu dữ liệu bắt buộc', 400);
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
        return error(res, 'Lỗi server khi sửa menu');
      }
      if (result.affectedRows === 0) {
        return error(res, 'Không tìm thấy menu để sửa', 404);
      }
      success(res, 'Sửa menu thành công');
    }
  );
});

/**
 * Xóa menu
 */
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  // Bước 1: Xóa tất cả menu con có parent là id
  const deleteChildrenSql = `DELETE FROM job_menus WHERE parent = ?`;
  db.query(deleteChildrenSql, [id], (err, result) => {
    if (err) {
      console.error('Lỗi khi xóa menu con:', err);
      return error(res, 'Lỗi server khi xóa menu con');
    }

    // Bước 2: Xóa menu cha
    const deleteParentSql = `DELETE FROM job_menus WHERE id = ?`;
    db.query(deleteParentSql, [id], (err, result) => {
      if (err) {
        console.error('Lỗi khi xóa menu cha:', err);
        return error(res, 'Lỗi server khi xóa menu cha');
      }

      if (result.affectedRows === 0) {
        return error(res, 'Không tìm thấy menu để xóa', 404);
      }

      return success(res, 'Xóa menu và tất cả menu con thành công');
    });
  });
});


module.exports = router;
