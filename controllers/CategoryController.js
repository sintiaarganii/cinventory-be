import { pool } from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      search = "",
      sort_by = "id",
      sort_order = "DESC",
      start_date,
      end_date,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page harus lebih dari 0",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit harus antara 1 - 100",
      });
    }

    const allowedSortFields = ["id", "category_name", "created_at"];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : "id";
    const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    let whereClause = [];
    let params = [];
    let index = 1;

    // SEARCH
    if (search && search.trim()) {
      whereClause.push(`
                (
                    category_name ILIKE $${index}
                    OR description ILIKE $${index}
                )
            `);
      params.push(`%${search.trim()}%`);
      index++;
    }

    // FILTER TANGGAL AWAL
    if (start_date) {
      whereClause.push(`DATE(created_at) >= $${index}`);
      params.push(start_date);
      index++;
    }

    // FILTER TANGGAL AKHIR
    if (end_date) {
      whereClause.push(`DATE(created_at) <= $${index}`);
      params.push(end_date);
      index++;
    }

    let whereSQL = "";
    if (whereClause.length > 0) {
      whereSQL = "WHERE " + whereClause.join(" AND ");
    }

    // COUNT
    const countQuery = `SELECT COUNT(*) AS total FROM categories ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
            SELECT
                id,
                category_name,
                description,
                created_at
            FROM categories
            ${whereSQL}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT $${index}
            OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(totalItems / limitNum);

    // Selalu return 200 dengan data (bisa kosong)
    return res.status(200).json({
      success: true,
      message: "Data kategori berhasil diambil",
      data: result.rows,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: pageNum,
        per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1,
      },
      filters: {
        search: search || null,
        start_date: start_date || null,
        end_date: end_date || null,
        sort_by: sortField,
        sort_order: sortDirection,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
            SELECT *
            FROM categories
            WHERE id = $1
            `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const CreateCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    const check = await pool.query(
      `
            SELECT *
            FROM categories
            WHERE category_name = $1
            `,
      [category_name],
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Category sudah ada",
      });
    }

    await pool.query(
      `
            INSERT INTO categories (
                category_name,
                description
            )
            VALUES ($1,$2)
            `,
      [category_name, description],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "CREATE",
      "CATEGORY",
      `Add Category ${category_name}`,
    );
    res.status(201).json({
      message: "Category added successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const UpdateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const { category_name, description } = req.body;

    await pool.query(
      `
            UPDATE categories
            SET
                category_name = $1,
                description = $2
            WHERE id = $3
            `,
      [category_name, description, id],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "UPDATE",
      "CATEGORY",
      `Update Category ${category_name}`,
    );
    res.status(200).json({
      message: "Category berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const DeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // cek kategori
    const category = await pool.query(
      `SELECT * FROM categories WHERE id = $1`,
      [id]
    );

    if (category.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryName = category.rows[0].category_name;

    await pool.query(
      `DELETE FROM categories WHERE id = $1`,
      [id]
    );

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "DELETE",
      "CATEGORY",
      `Delete Category ${categoryName}`
    );

    res.status(200).json({
      success: true,
      message: "Category berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};