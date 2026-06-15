import { pool } from "../config/db.js";

export const GetStockMovements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5, // ← Ubah dari 10 menjadi 5
      search = "",
      transaction_type = "",
      start_date = "",
      end_date = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    // SEARCH by product name or reference code
    if (search && search.trim()) {
      whereClause.push(
        `(p.product_name ILIKE $${index} OR sm.reference_code ILIKE $${index})`,
      );
      params.push(`%${search.trim()}%`);
      index++;
    }

    // FILTER by transaction type
    if (transaction_type && transaction_type.trim()) {
      whereClause.push(`sm.transaction_type = $${index}`);
      params.push(transaction_type);
      index++;
    }

    // FILTER by start date
    if (start_date) {
      whereClause.push(`DATE(sm.created_at) >= $${index}`);
      params.push(start_date);
      index++;
    }

    // FILTER by end date
    if (end_date) {
      whereClause.push(`DATE(sm.created_at) <= $${index}`);
      params.push(end_date);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    // COUNT TOTAL
    const countQuery = `
            SELECT COUNT(*) as total
            FROM stock_movements sm
            JOIN products p ON p.id = sm.product_id
            ${whereSQL}
        `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // GET DATA
    const dataQuery = `
            SELECT
                sm.id,
                p.product_name,
                sm.transaction_type,
                sm.reference_code,
                sm.quantity,
                sm.from_location,
                sm.to_location,
                sm.notes,
                sm.created_by_name,
                sm.created_at
            FROM stock_movements sm
            JOIN products p ON p.id = sm.product_id
            ${whereSQL}
            ORDER BY sm.created_at DESC
            LIMIT $${index} OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const movements = result.rows.map((row) => ({
      id: row.id,
      product_name: row.product_name,
      transaction_type: row.transaction_type,
      reference_code: row.reference_code,
      quantity: parseInt(row.quantity),
      from_location: row.from_location || null,
      to_location: row.to_location || null,
      notes: row.notes || null,
      created_by: row.created_by_name || "System",
      created_at: row.created_at,
    }));

    res.status(200).json({
      success: true,
      total: total,
      current_page: pageNum,
      total_pages: Math.ceil(total / limitNum),
      per_page: limitNum,
      data: movements,
    });
  } catch (error) {
    console.error("Error in GetStockMovements:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetProductMovement = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
            SELECT
                transaction_type,
                reference_code,
                quantity,
                from_location,
                to_location,
                notes,
                created_at
            FROM stock_movements
            WHERE product_id = $1
            ORDER BY created_at DESC
            `,
      [id],
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error in GetProductMovement:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get summary statistics
export const GetStockMovementSummary = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                COUNT(*) as total_movements,
                SUM(CASE WHEN transaction_type = 'IN' THEN 1 ELSE 0 END) as total_in,
                SUM(CASE WHEN transaction_type = 'OUT' THEN 1 ELSE 0 END) as total_out,
                SUM(CASE WHEN transaction_type = 'TRANSFER' THEN 1 ELSE 0 END) as total_transfer,
                SUM(CASE WHEN transaction_type = 'IN' THEN quantity ELSE 0 END) as total_quantity_in,
                SUM(CASE WHEN transaction_type = 'OUT' THEN quantity ELSE 0 END) as total_quantity_out
            FROM stock_movements
        `);

    res.status(200).json({
      success: true,
      data: {
        total_movements: parseInt(result.rows[0].total_movements),
        total_in: parseInt(result.rows[0].total_in),
        total_out: parseInt(result.rows[0].total_out),
        total_transfer: parseInt(result.rows[0].total_transfer),
        total_quantity_in: parseInt(result.rows[0].total_quantity_in),
        total_quantity_out: parseInt(result.rows[0].total_quantity_out),
      },
    });
  } catch (error) {
    console.error("Error in GetStockMovementSummary:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
