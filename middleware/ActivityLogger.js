import { pool } from "../config/db.js";

export const LogActivity = async (
  userId,
  userName,
  activityType,
  moduleName,
  description,
) => {
  try {
    await pool.query(
      `
      INSERT INTO activity_logs
      (
        user_id,
        user_name,
        activity_type,
        module_name,
        description
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [userId, userName, activityType, moduleName, description],
    );
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};
