import { pool } from "../config/db.js";

export const GetDashboardStats = async (req, res) => {
  try {
    const [
      users,
      categories,
      suppliers,
      locations,
      products,
      receipts,
      issues,
      lowStock,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM categories`),
      pool.query(`SELECT COUNT(*) FROM suppliers`),
      pool.query(`SELECT COUNT(*) FROM locations`),
      pool.query(`SELECT COUNT(*) FROM products`),
      pool.query(`SELECT COUNT(*) FROM goods_receipts`),
      pool.query(`SELECT COUNT(*) FROM goods_issues`),
      pool.query(`
                SELECT COUNT(*)
                FROM products
                WHERE stock <= minimum_stock
            `),
    ]);

    res.status(200).json({
      success: true,

      total_users: Number(users.rows[0].count),
      total_categories: Number(categories.rows[0].count),
      total_suppliers: Number(suppliers.rows[0].count),
      total_locations: Number(locations.rows[0].count),
      total_products: Number(products.rows[0].count),
      total_goods_receipts: Number(receipts.rows[0].count),
      total_goods_issues: Number(issues.rows[0].count),
      low_stock_products: Number(lowStock.rows[0].count),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetRecentActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sm.id,
        p.product_name,
        sm.transaction_type,
        sm.reference_code,
        sm.quantity,
        sm.created_at
      FROM stock_movements sm
      JOIN products p
        ON p.id = sm.product_id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetManagerDashboard = async (req, res) => {
  try {
    const [pendingReceipts, pendingIssues, approvedReceipts, approvedIssues] =
      await Promise.all([
        pool.query(`
                SELECT COUNT(*)
                FROM goods_receipts
                WHERE status='Pending'
            `),

        pool.query(`
                SELECT COUNT(*)
                FROM goods_issues
                WHERE status='Pending'
            `),

        pool.query(`
                SELECT COUNT(*)
                FROM goods_receipts
                WHERE status='Approved'
            `),

        pool.query(`
                SELECT COUNT(*)
                FROM goods_issues
                WHERE status='Approved'
            `),
      ]);

    res.status(200).json({
      pending_receipts: pendingReceipts.rows[0].count,
      pending_issues: pendingIssues.rows[0].count,
      approved_receipts: approvedReceipts.rows[0].count,
      approved_issues: approvedIssues.rows[0].count,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const GetLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(`
                SELECT
                    id,
                    product_code,
                    product_name,
                    stock,
                    minimum_stock
                FROM products
                WHERE stock <= minimum_stock
                ORDER BY stock ASC
            `);

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const GetStaffDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    const [todayReceipts, todayIssues, pendingTasks, totalMovements] =
      await Promise.all([
        // Today's receipts created by this staff
        pool.query(
          `
                SELECT COUNT(*)
                FROM goods_receipts
                WHERE created_by = $1
                AND DATE(created_at) = CURRENT_DATE
            `,
          [userId],
        ),

        // Today's issues created by this staff
        pool.query(
          `
                SELECT COUNT(*)
                FROM goods_issues
                WHERE created_by = $1
                AND DATE(created_at) = CURRENT_DATE
            `,
          [userId],
        ),

        // Pending tasks (receipts/issues created by staff that are still pending)
        pool.query(
          `
                SELECT 
                    (SELECT COUNT(*) FROM goods_receipts WHERE created_by = $1 AND status = 'Pending') +
                    (SELECT COUNT(*) FROM goods_issues WHERE created_by = $1 AND status = 'Pending') as total
            `,
          [userId],
        ),

        // Total stock movements
        pool.query(`SELECT COUNT(*) FROM stock_movements`),
      ]);

    res.status(200).json({
      success: true,
      today_receipts: parseInt(todayReceipts.rows[0].count),
      today_issues: parseInt(todayIssues.rows[0].count),
      my_pending_tasks: parseInt(pendingTasks.rows[0].total),
      total_movements: parseInt(totalMovements.rows[0].count),
    });
  } catch (error) {
    console.error("Error in GetStaffDashboard:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetStaffRecentMovements = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                sm.id,
                p.product_name,
                sm.transaction_type,
                sm.reference_code,
                sm.quantity,
                sm.created_at
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            ORDER BY sm.created_at DESC
            LIMIT 10
        `);

    res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error in GetStaffRecentMovements:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get weekly activity summary
export const GetWeeklyActivity = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                EXTRACT(DOW FROM created_at) as day_of_week,
                COUNT(CASE WHEN transaction_type = 'IN' THEN 1 END) as stock_in,
                COUNT(CASE WHEN transaction_type = 'OUT' THEN 1 END) as stock_out
            FROM stock_movements
            WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
            GROUP BY EXTRACT(DOW FROM created_at)
            ORDER BY day_of_week
        `);

    // Default data for all days (Monday to Sunday)
    const weeklyData = [
      { day: "Mon", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Tue", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Wed", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Thu", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Fri", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Sat", stock_in: 0, stock_out: 0, total: 0 },
      { day: "Sun", stock_in: 0, stock_out: 0, total: 0 },
    ];

    // Map database results to days
    // PostgreSQL: 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const dayMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

    result.rows.forEach((row) => {
      const dayIndex = dayMap[row.day_of_week] || 0;
      weeklyData[dayIndex].stock_in = parseInt(row.stock_in) || 0;
      weeklyData[dayIndex].stock_out = parseInt(row.stock_out) || 0;
      weeklyData[dayIndex].total =
        weeklyData[dayIndex].stock_in + weeklyData[dayIndex].stock_out;
    });

    res.status(200).json({
      success: true,
      data: weeklyData,
    });
  } catch (error) {
    console.error("Error in GetWeeklyActivity:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetNotifications = async (req, res) => {
  try {
    const [lowStock, pendingReceipt, pendingIssue] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)
        FROM products
        WHERE stock <= minimum_stock
      `),

      pool.query(`
        SELECT COUNT(*)
        FROM goods_receipts
        WHERE status='Pending'
      `),

      pool.query(`
        SELECT COUNT(*)
        FROM goods_issues
        WHERE status='Pending'
      `),
    ]);

    res.status(200).json({
      low_stock: Number(lowStock.rows[0].count),

      pending_receipts: Number(pendingReceipt.rows[0].count),

      pending_issues: Number(pendingIssue.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
