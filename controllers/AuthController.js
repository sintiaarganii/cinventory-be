import { pool } from "../Config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Account is inactive",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Incorrect password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );
    await LogActivity(
      user.id,
      user.fullname,
      "LOGIN",
      "AUTH",
      `${user.fullname} berhasil login`,
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const Me = async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT
                id,
                fullname,
                email,
                role
            FROM users
            WHERE id = $1
            `,
      [req.user.id],
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
