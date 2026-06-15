import { pool } from "../config/db.js";

/*
=========================================
LAPORAN BARANG MASUK
=========================================
*/
export const GetGoodsReceiptReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      search = "",
      status = "",
      start_date = "",
      end_date = "",
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
            FROM goods_receipts gr
            JOIN suppliers s
                ON gr.supplier_id = s.id
            WHERE 1=1
        `;

    let params = [];
    let paramIndex = 1;

    // search
    if (search) {
      query += `
                AND (
                    gr.receipt_code ILIKE $${paramIndex}
                    OR s.supplier_name ILIKE $${paramIndex}
                )
            `;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // status
    if (status) {
      query += `
                AND gr.status = $${paramIndex}
            `;
      params.push(status);
      paramIndex++;
    }

    // tanggal awal
    if (start_date) {
      query += `
                AND DATE(gr.created_at) >= $${paramIndex}
            `;
      params.push(start_date);
      paramIndex++;
    }

    // tanggal akhir
    if (end_date) {
      query += `
                AND DATE(gr.created_at) <= $${paramIndex}
            `;
      params.push(end_date);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${query}`, params);

    const totalData = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `
            SELECT
                gr.id,
                gr.receipt_code,
                s.supplier_name,
                gr.status,
                gr.created_at
            ${query}
            ORDER BY gr.created_at DESC
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
            `,
      [...params, limit, offset],
    );

    res.status(200).json({
      success: true,
      total_data: totalData,
      current_page: Number(page),
      total_pages: Math.ceil(totalData / limit),
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
=========================================
LAPORAN BARANG KELUAR
=========================================
*/
export const GetGoodsIssueReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      search = "",
      status = "",
      start_date = "",
      end_date = "",
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
            FROM goods_issues
            WHERE 1=1
        `;

    let params = [];
    let paramIndex = 1;

    if (search) {
      query += `
                AND (
                    issue_code ILIKE $${paramIndex}
                    OR destination ILIKE $${paramIndex}
                )
            `;

      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += `
                AND status = $${paramIndex}
            `;

      params.push(status);
      paramIndex++;
    }

    if (start_date) {
      query += `
                AND DATE(created_at) >= $${paramIndex}
            `;

      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += `
                AND DATE(created_at) <= $${paramIndex}
            `;

      params.push(end_date);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${query}`, params);

    const totalData = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `
                SELECT
                    id,
                    issue_code,
                    destination,
                    status,
                    created_at
                ${query}
                ORDER BY created_at DESC
                LIMIT $${paramIndex}
                OFFSET $${paramIndex + 1}
                `,
      [...params, limit, offset],
    );

    res.status(200).json({
      success: true,
      total_data: totalData,
      current_page: Number(page),
      total_pages: Math.ceil(totalData / limit),
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
=========================================
LAPORAN STOK
=========================================
*/
export const GetStockReport = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "", low_stock = false } = req.query;

    const offset = (page - 1) * limit;

    let query = `
            FROM products
            WHERE 1=1
        `;

    let params = [];
    let paramIndex = 1;

    if (search) {
      query += `
                AND (
                    product_code ILIKE $${paramIndex}
                    OR product_name ILIKE $${paramIndex}
                )
            `;

      params.push(`%${search}%`);

      paramIndex++;
    }

    if (low_stock === "true") {
      query += `
                AND stock <= minimum_stock
            `;
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${query}`, params);

    const totalData = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `
                SELECT
                    product_code,
                    product_name,
                    stock,
                    minimum_stock
                ${query}
                ORDER BY product_name ASC
                LIMIT $${paramIndex}
                OFFSET $${paramIndex + 1}
                `,
      [...params, limit, offset],
    );

    res.status(200).json({
      success: true,
      total_data: totalData,
      current_page: Number(page),
      total_pages: Math.ceil(totalData / limit),
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
