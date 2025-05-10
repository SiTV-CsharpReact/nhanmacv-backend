const express = require("express");
const router = express.Router();
const db = require("../db");
const moment = require("moment");
const { success, error } = require("../utils/utils");
/**
 * @swagger
 * /contents:
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
function buildWhereClause({ startTime, endTime, state, sectionid, keyword }) {
  const conditions = [];
  const params = [];

  if (startTime && endTime) {
    // startTime, endTime dạng 'DD/MM/YYYY'
    const from = moment(startTime, "DD/MM/YYYY")
      .startOf("day")
      .format("YYYY-MM-DD");
    const to = moment(endTime, "DD/MM/YYYY").endOf("day").format("YYYY-MM-DD");
    conditions.push("DATE(created) BETWEEN ? AND ?");
    params.push(from, to);
  } else if (startTime) {
    const from = moment(startTime, "DD/MM/YYYY")
      .startOf("day")
      .format("YYYY-MM-DD");
    conditions.push("DATE(created) >= ?");
    params.push(from);
  } else if (endTime) {
    const to = moment(endTime, "DD/MM/YYYY").endOf("day").format("YYYY-MM-DD");
    conditions.push("DATE(created) <= ?");
    params.push(to);
  }

  if (state !== undefined && state !== null && state !== "") {
    conditions.push("state = ?");
    params.push(Number(state));
  }

  if (sectionid) {
    conditions.push("sectionid = ?");
    params.push(sectionid);
  }

  if (keyword) {
    conditions.push("title LIKE ?");
    params.push(`%${keyword}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  return { whereClause, params };
}

// Hàm lấy tổng số bản ghi theo filter
// async function getTotalCount(db, filters) {
//   const { whereClause, params } = buildWhereClause(filters);
//   const sql = `SELECT COUNT(*) as total FROM jos_content ${whereClause}`;
//   const [[row]] = await db.promise().query(sql, params);
//   return row.total || 0;
// }

router.get("/", async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let pageSize = parseInt(req.query.pageSize, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 10;

    const offset = (page - 1) * pageSize;

    const filters = {
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      state: req.query.state,
      sectionid: req.query.sectionid,
      keyword: req.query.keyword,
    };

    // Build điều kiện WHERE và params cho truy vấn chính
    const { whereClause, params } = buildWhereClause(filters);

    // Thêm limit và offset vào params
    params.push(pageSize, offset);

    // Truy vấn dữ liệu với filter và phân trang
    const sql = `
      SELECT id, state, title, introtext, metakey,metadesc, created, created_by, alias
      FROM jos_content
      ${whereClause}
      ORDER BY created DESC
      LIMIT ? OFFSET ?
    `;

    const [results] = await db.promise().query(sql, params);
    // Lấy tổng số bản ghi phù hợp filter
    const total = await getTotalCount(db, filters);

    // Trả về response
    success(res, "Lấy danh sách bài viết thành công", {
      list: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    error(res, "Internal server error");
  }
});

/**
 * @swagger
 * /contents:
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
 *               image_desc: { type: string }
 *     responses:
 *       200:
 *         description: Thêm bài viết thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */

function toMySQLDateTime(dateString) {
  if (!dateString) return null;
  return moment(dateString).format("YYYY-MM-DD HH:mm:ss");
}

router.post("/", async (req, res) => {
  try {
    const {
      title,
      alias,
      title_alias,
      introtext,
      fulltext,
      state,
      sectionid,
      mask,
      catid,
      created,
      created_by,
      created_by_alias,
      modified,
      modified_by,
      checked_out,
      checked_out_time,
      publish_up,
      publish_down,
      images,
      urls,
      attribs,
      version,
      parentid,
      ordering,
      metakey,
      metadesc,
      access,
      hits,
      metadata,
      image_desc
    } = req.body;

    if (
      catid === undefined ||
      state === undefined ||
      !created ||
      !title ||
      !alias ||
      !title_alias ||
      !introtext
    ) {
      return res.status(400).json({
        error:
          "Thiếu thông tin bắt buộc (title, alias, title_alias, introtext, catid, state, created)",
      });
    }
    // const [aliasCheck] = await db
    //   .promise()
    //   .query("SELECT id FROM jos_content WHERE alias = ? LIMIT 1", [alias]);

    // if (aliasCheck.length > 0) {
    //   return res.status(409).json({
    //     error: "Alias đã tồn tại. Vui lòng chọn một alias khác.",
    //   });
    // }

    const sql = `
      INSERT INTO jos_content (
        title, alias, title_alias, introtext, \`fulltext\`, state, sectionid, mask, catid, created, created_by, created_by_alias,
        modified, modified_by, checked_out, checked_out_time, publish_up, publish_down,
        images, urls, attribs, version, parentid, ordering, metakey, metadesc, access, hits, metadata,image_desc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const params = [
      title || "",
      alias || "",
      title_alias || "",
      introtext || "",
      fulltext || "",
      state,
      sectionid || 0,
      mask || 0,
      catid,
      toMySQLDateTime(created),
      created_by || 0,
      created_by_alias || "",
      toMySQLDateTime(modified) || now,
      modified_by || 0,
      checked_out || 0,
      toMySQLDateTime(checked_out_time) || now,
      toMySQLDateTime(publish_up) || now,
      toMySQLDateTime(publish_down) || now,
      images || "",
      urls || "",
      attribs || "",
      version || 1,
      parentid || 0,
      ordering || 0,
      metakey || "",
      metadesc || "",
      access || 0,
      hits || 0,
      metadata || "",
      image_desc|| ""
    ];

    const [result] = await db.promise().query(sql, params);
    success(res, "Thêm bài viết thành công", { id: result.insertId }, 200);
  } catch (err) {
    error(res, "Internal server error");
  }
});

/**
 * @swagger
 * /contentss/{id}:
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
router.get("/:id", async (req, res) => {
  try {
    const contentId = parseInt(req.params.id, 10);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const [results] = await db.promise().query(
      `SELECT id,title, alias, title_alias, introtext, state, sectionid, catid,
                created, created_by, modified, modified_by, checked_out, checked_out_time,
                publish_up, publish_down, images, urls, attribs, version, parentid,
                ordering, metakey, metadesc, access, hits, metadata,image_desc
         FROM jos_content WHERE id = ?`,
      [contentId]
    );

    if (results.length === 0) {
      return error(res, "Bài viết không tồn tại", 404);
    }

    // Trả về kết quả
    success(res, "Lấy chi tiết bài viết thành công", results[0]);
  } catch (err) {
    console.error("Lỗi khi lấy bài viết theo ID:", err);
    error(res, "Lỗi server nội bộ");
  }
});

/**
 * @swagger
 * /contents/alias/{alias}:
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
router.get("/alias/:alias", async (req, res) => {
  try {
    const alias = req.params.alias;
    if (!alias) {
      return res.status(400).json({ error: "Alias is required" });
    }
   
    const [results] = await db
      .promise()
      .query(
        "SELECT id, title, introtext, metakey,metadesc, created, created_by FROM jos_content WHERE alias = ? LIMIT 1",
        [alias]
      );

    if (results.length === 0) {
      return error(res, "Bài viết không tồn tại", 404);
    }
    success(res, "Lấy bài viết theo alias thành công", results[0]);
   
  } catch (err) {
    error(res, "Internal server error");
  }
});


// API cập nhật bài viết theo ID
router.put("/:id", async (req, res) => {
  try {
    const contentId = parseInt(req.params.id, 10);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    // Lấy dữ liệu cập nhật từ body
    const {
      title,
      alias,
      title_alias,
      introtext,
      fulltext,
      state,
      sectionid,
      mask,
      catid,
      created,
      created_by,
      created_by_alias,
      modified,
      modified_by,
      checked_out,
      checked_out_time,
      publish_up,
      publish_down,
      images,
      urls,
      attribs,
      version,
      parentid,
      ordering,
      metakey,
      metadesc,
      access,
      hits,
      metadata,
      image_desc,
    } = req.body;

    // Kiểm tra bắt buộc (ví dụ: title, alias, catid, state)
    if (
      catid === undefined ||
      state === undefined ||
      !created ||
      !title ||
      !alias ||
      !title_alias ||
      !introtext
    ) {
      return res.status(400).json({
        error:
          "Thiếu thông tin bắt buộc (title, alias, title_alias, introtext, catid, state, created)",
      });
    }

    // Câu truy vấn cập nhật
    const sql = `
  UPDATE jos_content SET
    title = ?, alias = ?, title_alias = ?, introtext = ?, \`fulltext\` = ?, state = ?, sectionid = ?, mask = ?, catid = ?,
    created = ?, created_by = ?, created_by_alias = ?, modified = ?, modified_by = ?, checked_out = ?, checked_out_time = ?,
    publish_up = ?, publish_down = ?, images = ?, urls = ?, attribs = ?, version = ?, parentid = ?, ordering = ?,
    metakey = ?, metadesc = ?, access = ?, hits = ?, metadata = ?, image_desc = ?
  WHERE id = ?
`;

    const params = [
      title || "",
      alias || "",
      title_alias || "",
      introtext || "",
      fulltext || "",
      state,
      sectionid || 0,
      mask || 0,
      catid,
      toMySQLDateTime(created),
      created_by || 0,
      created_by_alias || "",
      toMySQLDateTime(modified) || moment().format("YYYY-MM-DD HH:mm:ss"),
      modified_by || 0,
      checked_out || 0,
      toMySQLDateTime(checked_out_time) ||
        moment().format("YYYY-MM-DD HH:mm:ss"),
      toMySQLDateTime(publish_up) || moment().format("YYYY-MM-DD HH:mm:ss"),
      toMySQLDateTime(publish_down) || moment().format("YYYY-MM-DD HH:mm:ss"),
      images || "",
      urls || "",
      attribs || "",
      version || 1,
      parentid || 0,
      ordering || 0,
      metakey || "",
      metadesc || "",
      access || 0,
      hits || 0,
      metadata || "",
      image_desc|| "",
      contentId
    ];

    const [result] = await db.promise().query(sql, params);
    if (result.affectedRows === 0) {
      return error(res, "Bài viết không tồn tại", 404);
    }

    success(res, "Cập nhật bài viết thành công");
  } catch (err) {
    console.error(err);
    error(res, "Lỗi server nội bộ");
  }
});


/**
 * @swagger
 * /contents/{id}:
 *   delete:
 *     summary: Xóa bài viết theo ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID bài viết cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Bài viết không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete("/:id", async (req, res) => {
  try {
    const contentId = parseInt(req.params.id, 10);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const [result] = await db
      .promise()
      .query("DELETE FROM jos_content WHERE id = ?", [contentId]);

    if (result.affectedRows === 0) {
      return error(res, "Bài viết không tồn tại", 404);
    }

    success(res, "Xóa bài viết thành công", null, 200);
  } catch (err) {
    console.error("Lỗi khi xóa bài viết:", err);
    error(res, "Lỗi server nội bộ");
  }
});
// Hàm helper lấy tổng số bài viết
async function getTotalCount(db, filters) {
  const { whereClause, params } = buildWhereClause(filters);
  const [result] = await db
    .promise()
    .query(`SELECT COUNT(*) as total FROM jos_content ${whereClause}`, params);
  return result[0].total;
}

module.exports = router;
