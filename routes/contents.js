
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
/** @swagger
 * /content:
 *   get:
 *     summary: Lấy danh sách bài viết (bảng jos_content)
 *     responses:
 *       200:
 *         description: Danh sách bài viết
 */


  router.get('/', (req, res) => {
    db.query('SELECT id, title, introtext,metakey, created, created_by FROM jos_content LIMIT 100', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
      });
  });
  router.get('/:id', (req, res) => {
    const contentId = req.params.id;
    db.query('SELECT id, title, introtext, metakey, created, created_by FROM jos_content WHERE id = ?', [contentId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
      res.json(results[0]);
    });
  });
module.exports = router;

  