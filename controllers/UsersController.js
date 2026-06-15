import { pool } from "../Config/db.js";
import bcrypt from "bcrypt";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    if (search && search.trim()) {
      whereClause.push(`(fullname ILIKE $${index} OR email ILIKE $${index})`);
      params.push(`%${search.trim()}%`);
      index++;
    }

    if (role) {
      const capitalizedRole =
        role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      whereClause.push(`role = $${index}`);
      params.push(capitalizedRole);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) total FROM users ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
            SELECT id, fullname, email, role, is_active, created_at 
            FROM users 
            ${whereSQL}
            ORDER BY id DESC
            LIMIT $${index} OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const users = result.rows.map((user) => ({
      ...user,
      role: user.role.toLowerCase(),
    }));

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      total_pages: Math.ceil(total / limitNum),
      users: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const CreateUser = async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;

    // Validasi input
    if (!fullname || fullname.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 3 characters",
      });
    }

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const validRoles = ["admin", "manager", "staff"];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected",
      });
    }

    // Check if email already exists
    const check = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email.toLowerCase(),
    ]);
    if (check.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const capitalizedRole =
      role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (fullname, email, password, role, is_active) 
             VALUES ($1, $2, $3, $4, true)`,
      [fullname.trim(), email.toLowerCase(), hashPassword, capitalizedRole],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "CREATE",
      "USER",
      `Add User ${fullname}`,
    );
    res.status(201).json({
      success: true,
      message: "User created successfully",
    });

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      `Create User ${fullname}`,
      "Users",
    );
  } catch (error) {
    console.error("Error in CreateUser:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, role, is_active } = req.body;

    // Validasi input
    if (fullname !== undefined && fullname.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 3 characters",
      });
    }

    if (email !== undefined && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required",
      });
    }

    if (role !== undefined) {
      const validRoles = ["admin", "manager", "staff"];
      if (!validRoles.includes(role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid role selected",
        });
      }
    }

    const checkUser = await pool.query(`SELECT * FROM users WHERE id = $1`, [
      id,
    ]);

    if (checkUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is being changed, check if it already exists for another user
    if (email !== undefined) {
      const emailCheck = await pool.query(
        `SELECT * FROM users WHERE email = $1 AND id != $2`,
        [email.toLowerCase(), id],
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    let updateFields = [];
    let params = [];
    let index = 1;

    if (fullname !== undefined) {
      updateFields.push(`fullname = $${index++}`);
      params.push(fullname.trim());
    }
    if (email !== undefined) {
      updateFields.push(`email = $${index++}`);
      params.push(email.toLowerCase());
    }
    if (role !== undefined) {
      const capitalizedRole =
        role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      updateFields.push(`role = $${index++}`);
      params.push(capitalizedRole);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${index++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    params.push(id);

    const query = `
            UPDATE users
            SET ${updateFields.join(", ")}
            WHERE id = $${index}
        `;

    await pool.query(query, params);
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "UPDATE",
      "USER",
      `Update User ${fullname}`,
    );
    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      `Update User ${fullname}`,
      "Users",
    );
  } catch (error) {
    console.error("Error in UpdateUser:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const ToggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [
      is_active,
      id,
    ]);

    res.status(200).json({
      success: true,
      message: is_active
        ? "User activated successfully"
        : "User deactivated successfully",
    });
    await LogActivity(
      req.userId,
      "Admin",
      is_active ? `Activate User` : `Deactivate User`,
      "Users",
    );
  } catch (error) {
    console.error("Error in ToggleUserStatus:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
