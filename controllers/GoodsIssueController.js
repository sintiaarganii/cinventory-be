import { pool } from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetGoodsIssues = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5, // ← Ubah dari 10 menjadi 5
      search = "",
      status = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    if (search && search.trim()) {
      whereClause.push(
        `issue_code ILIKE $${index} OR destination ILIKE $${index}`,
      );
      params.push(`%${search.trim()}%`);
      index++;
    }

    if (status && status.trim()) {
      whereClause.push(`status = $${index}`);
      params.push(status);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    // COUNT TOTAL
    const countQuery = `SELECT COUNT(*) as total FROM goods_issues ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // GET DATA
    const dataQuery = `
      SELECT
        id,
        issue_code,
        issue_date,
        destination,
        status,
        notes
      FROM goods_issues
      ${whereSQL}
      ORDER BY id DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    res.status(200).json({
      success: true,
      total: total,
      total_pages: Math.ceil(total / limitNum),
      current_page: pageNum,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in GetGoodsIssues:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetGoodsIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    const header = await pool.query(
      `
                  SELECT *
                  FROM goods_issues
                  WHERE id = $1
                  `,
      [id],
    );

    const details = await pool.query(
      `
                  SELECT
                      gid.id,
                      p.product_name,
                      gid.quantity
                  FROM goods_issue_details gid
                  JOIN products p
                      ON gid.product_id = p.id
                  WHERE gid.issue_id = $1
                  `,
      [id],
    );

    res.status(200).json({
      header: header.rows[0],
      details: details.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const CreateGoodsIssue = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { issue_code, issue_date, destination, notes, items } = req.body;

    // =========================
    // VALIDASI TANGGAL
    // =========================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(issue_date);
    selectedDate.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 3);

    if (selectedDate < minDate) {
      return res.status(400).json({
        success: false,
        message: "Issue date maksimal hanya boleh 3 hari ke belakang",
      });
    }

    if (selectedDate > today) {
      return res.status(400).json({
        success: false,
        message: "Issue date tidak boleh melebihi tanggal hari ini",
      });
    }

    // =========================
    // VALIDASI ITEMS
    // =========================
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal harus ada 1 produk",
      });
    }

    // =========================
    // INSERT HEADER
    // =========================
    const issue = await client.query(
      `
      INSERT INTO goods_issues (
          issue_code,
          issue_date,
          destination,
          notes,
          created_by
      )
      VALUES (
          $1,$2,$3,$4,$5
      )
      RETURNING id
      `,
      [issue_code, issue_date, destination, notes, req.userId],
    );

    const issueId = issue.rows[0].id;

    // =========================
    // INSERT DETAIL
    // =========================
    for (const item of items) {
      await client.query(
        `
        INSERT INTO goods_issue_details (
            issue_id,
            product_id,
            quantity
        )
        VALUES (
            $1,$2,$3
        )
        `,
        [issueId, item.product_id, item.quantity],
      );
    }

    await client.query("COMMIT");

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Staff",
      "CREATE",
      "GOODS ISSUE",
      `Create Goods Issue ${issue_code}`,
    );

    res.status(201).json({
      success: true,
      message: "Request Goods Issue created successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error in CreateGoodsIssue:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const ApproveGoodsIssue = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const issueId = req.params.id;

    const issue = await client.query(
      `
        SELECT *
        FROM goods_issues
        WHERE id = $1
        `,
      [issueId],
    );

    if (issue.rows.length === 0) {
      return res.status(404).json({
        message: "Data not found",
      });
    }

    if (issue.rows[0].status !== "Pending") {
      return res.status(400).json({
        message: "Already processed",
      });
    }

    const details = await client.query(
      `
        SELECT *
        FROM goods_issue_details
        WHERE issue_id = $1
        `,
      [issueId],
    );

    for (const item of details.rows) {
      // Check stock availability
      const product = await client.query(
        `
          SELECT stock
          FROM products
          WHERE id = $1
          `,
        [item.product_id],
      );

      if (product.rows[0].stock < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.product_id}`);
      }

      // UPDATE PRODUCT STOCK - REDUCE STOCK
      await client.query(
        `
          UPDATE products
          SET stock = stock - $1
          WHERE id = $2
          `,
        [item.quantity, item.product_id],
      );

      // Get product location
      const productLoc = await client.query(
        `SELECT l.location_name FROM products p 
          JOIN locations l ON l.id = p.location_id 
          WHERE p.id = $1`,
        [item.product_id],
      );

      // Insert stock movement record
      await client.query(
        `
          INSERT INTO stock_movements (
              product_id,
              transaction_type,
              reference_code,
              quantity,
              from_location,
              to_location,
              created_by,
              created_by_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
        [
          item.product_id,
          "OUT",
          issue.rows[0].issue_code,
          item.quantity,
          productLoc.rows[0].location_name,
          issue.rows[0].destination,
          req.userId,
          req.userName || "System",
        ],
      );
    }

    await client.query(
      `
        UPDATE goods_issues
        SET
            status = 'Approved',
            approved_by = $1,
            approved_at = NOW()
        WHERE id = $2
        `,
      [req.userId, issueId],
    );

    await client.query("COMMIT");
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Manager",
      "APPROVE",
      "GOODS ISSUE",
      `Approve Goods Issue ${issue.rows[0].issue_code}`,
    );
    res.status(200).json({
      message: "Goods issue has been approved",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in ApproveGoodsIssue:", error);
    res.status(500).json({
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const RejectGoodsIssue = async (req, res) => {
  try {
    await pool.query(
      `
              UPDATE goods_issues
              SET status = 'Rejected'
              WHERE id = $1
              `,
      [req.params.id],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "REJECT",
      "GOODS ISSUE",
      `Reject Goods Issue ID ${req.params.id}`,
    );
    res.status(200).json({
      message: "Barang keluar ditolak",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
