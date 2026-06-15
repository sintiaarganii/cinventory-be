import pool from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetGoodsReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5, // Ubah default limit menjadi 5
      search = "",
      status = "",
      supplier_id = "",
      sort_by = "id",
      sort_order = "DESC",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    if (search && search.trim()) {
      whereClause.push(`
                (
                    gr.receipt_code ILIKE $${index}
                    OR s.supplier_name ILIKE $${index}
                )
            `);
      params.push(`%${search}%`);
      index++;
    }

    if (status && status.trim()) {
      whereClause.push(`gr.status = $${index}`);
      params.push(status);
      index++;
    }

    if (supplier_id) {
      whereClause.push(`gr.supplier_id = $${index}`);
      params.push(supplier_id);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    // COUNT TOTAL
    const countQuery = `
      SELECT COUNT(*) as total
      FROM goods_receipts gr
      JOIN suppliers s ON gr.supplier_id = s.id
      ${whereSQL}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // GET DATA
    const dataQuery = `
      SELECT
        gr.id,
        gr.receipt_code,
        s.supplier_name,
        gr.receipt_date,
        gr.status,
        gr.notes
      FROM goods_receipts gr
      JOIN suppliers s ON gr.supplier_id = s.id
      ${whereSQL}
      ORDER BY gr.${sort_by} ${sort_order}
      LIMIT $${index} OFFSET $${index + 1}
    `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    res.status(200).json({
      success: true,
      total: total,
      total_pages: Math.ceil(total / limitNum),
      current_page: pageNum,
      per_page: limitNum,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in GetGoodsReceipts:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================
// GET GOODS RECEIPT BY ID (with details)
// =====================
export const GetGoodsReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Fetching receipt with ID:", id); // Debug log

    // Get receipt header
    const receiptResult = await pool.query(
      `
      SELECT 
        gr.id,
        gr.receipt_code,
        gr.receipt_date,
        gr.notes,
        gr.status,
        gr.created_at,
        s.supplier_name,
        s.id as supplier_id
      FROM goods_receipts gr
      JOIN suppliers s ON gr.supplier_id = s.id
      WHERE gr.id = $1
      `,
      [id],
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    // Get receipt details (products)
    const detailsResult = await pool.query(
      `
      SELECT 
        grd.id,
        grd.product_id,
        grd.quantity,
        p.product_name,
        p.product_code,
        p.unit
      FROM goods_receipt_details grd
      JOIN products p ON grd.product_id = p.id
      WHERE grd.receipt_id = $1
      `,
      [id],
    );

    console.log("Found details:", detailsResult.rows.length); // Debug log

    res.status(200).json({
      success: true,
      header: receiptResult.rows[0],
      details: detailsResult.rows,
    });
  } catch (error) {
    console.error("Error in GetGoodsReceiptById:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const CreateGoodsReceipt = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { receipt_code, supplier_id, receipt_date, notes, items } = req.body;

    // =========================
    // VALIDASI TANGGAL
    // =========================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(receipt_date);
    selectedDate.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 3);

    if (selectedDate < minDate) {
      return res.status(400).json({
        success: false,
        message: "Receipt date maksimal hanya boleh 3 hari ke belakang",
      });
    }

    if (selectedDate > today) {
      return res.status(400).json({
        success: false,
        message: "Receipt date tidak boleh melebihi tanggal hari ini",
      });
    }

    // =========================
    // VALIDASI SUPPLIER
    // =========================
    const supplier = await client.query(
      `SELECT * FROM suppliers WHERE id = $1`,
      [supplier_id],
    );

    if (supplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier tidak ditemukan",
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
    const receiptResult = await client.query(
      `
      INSERT INTO goods_receipts (
          receipt_code,
          supplier_id,
          receipt_date,
          notes,
          created_by
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [receipt_code, supplier_id, receipt_date, notes, req.userId],
    );

    const receiptId = receiptResult.rows[0].id;

    // =========================
    // INSERT DETAIL
    // =========================
    for (const item of items) {
      await client.query(
        `
        INSERT INTO goods_receipt_details (
            receipt_id,
            product_id,
            quantity
        )
        VALUES ($1,$2,$3)
        `,
        [receiptId, item.product_id, item.quantity],
      );
    }

    await client.query("COMMIT");

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Staff",
      "CREATE",
      "GOODS RECEIPT",
      `Create Goods Receipt ${receipt_code}`,
    );

    res.status(201).json({
      success: true,
      message: "Goods receipt created successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error in CreateGoodsReceipt:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const ApproveGoodsReceipt = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const receiptId = req.params.id;

    const receipt = await client.query(
      `
      SELECT *
      FROM goods_receipts
      WHERE id = $1
      `,
      [receiptId],
    );

    if (receipt.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    if (receipt.rows[0].status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Already processed",
      });
    }

    const details = await client.query(
      `
      SELECT *
      FROM goods_receipt_details
      WHERE receipt_id = $1
      `,
      [receiptId],
    );

    for (const item of details.rows) {
      const productLoc = await client.query(
        `SELECT l.location_name FROM products p 
         JOIN locations l ON l.id = p.location_id 
         WHERE p.id = $1`,
        [item.product_id],
      );

      const supplier = await client.query(
        `SELECT supplier_name FROM suppliers WHERE id = $1`,
        [receipt.rows[0].supplier_id],
      );

      // UPDATE PRODUCT STOCK
      await client.query(
        `
        UPDATE products 
        SET stock = stock + $1 
        WHERE id = $2
        `,
        [item.quantity, item.product_id],
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
          "IN",
          receipt.rows[0].receipt_code,
          item.quantity,
          supplier.rows[0].supplier_name,
          productLoc.rows[0].location_name || "Warehouse",
          req.userId,
          req.userName || "System",
        ],
      );
    }

    await client.query(
      `
      UPDATE goods_receipts
      SET
          status = 'Approved',
          approved_by = $1,
          approved_at = NOW()
      WHERE id = $2
      `,
      [req.userId, receiptId],
    );

    await client.query("COMMIT");
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Manager",
      "APPROVE",
      "GOODS RECEIPT",
      `Approve Receipt ${receipt.rows[0].receipt_code}`,
    );
    res.status(200).json({
      success: true,
      message: "Goods receipt has been approved",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in ApproveGoodsReceipt:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const RejectGoodsReceipt = async (req, res) => {
  try {
    await pool.query(
      `
      UPDATE goods_receipts
      SET status = 'Rejected'
      WHERE id = $1
      `,
      [req.params.id],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.fullname || "Manager",
      "REJECT",
      "GOODS RECEIPT",
      "Reject Goods Receipt",
    );
    res.status(200).json({
      success: true,
      message: "Goods receipt has been rejected",
    });
  } catch (error) {
    console.error("Error in RejectGoodsReceipt:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
