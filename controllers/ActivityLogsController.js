import { pool } from "../Config/db.js";

export const GetActivityLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};