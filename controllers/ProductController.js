import { pool } from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      search = "",
      category_id = "",
      supplier_id = "",
      location_id = "",
      low_stock = "",
      sort_by = "id",
      sort_order = "DESC",
      show_inactive = "false",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = [
      "id",
      "product_name",
      "stock",
      "minimum_stock",
      "product_code",
    ];
    const sortField = allowedSort.includes(sort_by) ? sort_by : "id";
    const sortDir = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    let whereClause = [];
    let params = [];
    let index = 1;

    // SEARCH
    if (search && search.trim()) {
      whereClause.push(
        `(p.product_name ILIKE $${index} OR p.product_code ILIKE $${index})`,
      );
      params.push(`%${search.trim()}%`);
      index++;
    }

    // FILTER CATEGORY
    if (category_id) {
      whereClause.push(`p.category_id = $${index}`);
      params.push(category_id);
      index++;
    }

    // FILTER SUPPLIER
    if (supplier_id) {
      whereClause.push(`p.supplier_id = $${index}`);
      params.push(supplier_id);
      index++;
    }

    // FILTER LOCATION
    if (location_id) {
      whereClause.push(`p.location_id = $${index}`);
      params.push(location_id);
      index++;
    }

    // LOW STOCK
    if (low_stock === "true") {
      whereClause.push(`p.stock <= p.minimum_stock`);
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    // COUNT TOTAL
    const countQuery = `
            SELECT COUNT(*) AS total 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN locations l ON p.location_id = l.id
            ${whereSQL}
        `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // GET DATA
    const dataQuery = `
            SELECT
                p.id,
                p.product_code,
                p.product_name,
                p.category_id,
                p.supplier_id,
                p.location_id,
                c.category_name,
                s.supplier_name,
                l.location_name,
                p.stock,
                p.minimum_stock,
                p.unit,
                p.description,
                s.status as supplier_status,
                l.status as location_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN locations l ON p.location_id = l.id
            ${whereSQL}
            ORDER BY p.${sortField} ${sortDir}
            LIMIT $${index} OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const products = result.rows.map((row) => ({
      ...row,
      is_active:
        row.supplier_status === "Active" && row.location_status === "Active",
      supplier_status: row.supplier_status || "Unknown",
      location_status: row.location_status || "Unknown",
    }));

    return res.status(200).json({
      success: true,
      message: "Data produk berhasil diambil",
      data: products,
      total: total,
      current_page: pageNum,
      total_pages: Math.ceil(total / limitNum),
      per_page: limitNum,
    });
  } catch (error) {
    console.error("Error in GetProducts:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
            SELECT p.*, 
                   s.status as supplier_status, 
                   l.status as location_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN locations l ON p.location_id = l.id
            WHERE p.id = $1
            `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product tidak ditemukan",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error in GetProductById:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const CreateProduct = async (req, res) => {
  try {
    const {
      product_code,
      product_name,
      category_id,
      supplier_id,
      location_id,
      stock,
      minimum_stock,
      unit,
      description,
    } = req.body;

    // Check if product code already exists
    const existingProduct = await pool.query(
      `SELECT id FROM products WHERE product_code = $1`,
      [product_code],
    );

    if (existingProduct.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Product code already exists",
      });
    }

    // Check if supplier and location are active
    const supplier = await pool.query(
      `SELECT status FROM suppliers WHERE id = $1`,
      [supplier_id],
    );
    const location = await pool.query(
      `SELECT status FROM locations WHERE id = $1`,
      [location_id],
    );

    if (supplier.rows[0]?.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot create product: Selected supplier is inactive",
      });
    }
    if (location.rows[0]?.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot create product: Selected location is inactive",
      });
    }

    await pool.query(
      `
            INSERT INTO products (
                product_code,
                product_name,
                category_id,
                supplier_id,
                location_id,
                stock,
                minimum_stock,
                unit,
                description
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `,
      [
        product_code,
        product_name,
        category_id,
        supplier_id,
        location_id,
        stock,
        minimum_stock,
        unit,
        description,
      ],
    );
    await LogActivity(
      null,
      "Admin",
      "CREATE",
      "PRODUCT",
      `Menambahkan produk ${product_name}`,
    );
    res.status(201).json({
      success: true,
      message: "Product added successfully",
    });
  } catch (error) {
    console.error("Error in CreateProduct:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      category_id,
      supplier_id,
      location_id,
      stock,
      minimum_stock,
      unit,
      description,
    } = req.body;

    // Check if product exists
    const product = await pool.query(`SELECT * FROM products WHERE id = $1`, [
      id,
    ]);
    if (product.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if supplier and location are active
    const supplier = await pool.query(
      `SELECT status FROM suppliers WHERE id = $1`,
      [supplier_id],
    );
    const location = await pool.query(
      `SELECT status FROM locations WHERE id = $1`,
      [location_id],
    );

    if (supplier.rows[0]?.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot update product: Selected supplier is inactive",
      });
    }
    if (location.rows[0]?.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot update product: Selected location is inactive",
      });
    }

    await pool.query(
      `
            UPDATE products
            SET
                product_name = $1,
                category_id = $2,
                supplier_id = $3,
                location_id = $4,
                stock = $5,
                minimum_stock = $6,
                unit = $7,
                description = $8
            WHERE id = $9
            `,
      [
        product_name,
        category_id,
        supplier_id,
        location_id,
        stock,
        minimum_stock,
        unit,
        description,
        id,
      ],
    );
    await LogActivity(
      null,
      "Admin",
      "UPDATE",
      "PRODUCT",
      `Mengubah produk ${product_name}`,
    );
    res.status(200).json({
      success: true,
      message: "Product berhasil diupdate",
    });
  } catch (error) {
    console.error("Error in UpdateProduct:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const DeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await pool.query(`SELECT * FROM products WHERE id = $1`, [
      id,
    ]);

    if (product.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Simpan nama produk untuk log
    const productName = product.rows[0].product_name;

    // Check if product is used in any receipts or issues
    const receiptCheck = await pool.query(
      `SELECT COUNT(*) as count FROM goods_receipt_details WHERE product_id = $1`,
      [id],
    );

    const issueCheck = await pool.query(
      `SELECT COUNT(*) as count FROM goods_issue_details WHERE product_id = $1`,
      [id],
    );

    if (
      parseInt(receiptCheck.rows[0].count) > 0 ||
      parseInt(issueCheck.rows[0].count) > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product because it has transaction history",
      });
    }

    // Delete product
    await pool.query(`DELETE FROM products WHERE id = $1`, [id]);

    // Insert activity log
    await pool.query(
      `
      INSERT INTO activity_logs
      (
        user_name,
        activity_type,
        module_name,
        description
      )
      VALUES ($1,$2,$3,$4)
      `,
      ["Admin", "DELETE", "PRODUCT", `Menghapus produk ${productName}`],
    );

    res.status(200).json({
      success: true,
      message: "Product berhasil dihapus",
    });
  } catch (error) {
    console.error("Error in DeleteProduct:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
