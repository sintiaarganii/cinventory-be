import { pool } from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    if (search && search.trim()) {
      whereClause.push(
        `(supplier_name ILIKE $${index} OR contact_person ILIKE $${index} OR phone ILIKE $${index})`,
      );
      params.push(`%${search.trim()}%`);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
            SELECT id, supplier_code, supplier_name, contact_person, phone, email, address, status, created_at
            FROM suppliers 
            ${whereSQL}
            ORDER BY id DESC
            LIMIT $${index} OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const suppliers = result.rows.map((supplier) => ({
      ...supplier,
      status: supplier.status ? supplier.status.toLowerCase() : "inactive",
    }));

    return res.status(200).json({
      success: true,
      message: "Data supplier berhasil diambil",
      data: suppliers,
      total: total,
      current_page: pageNum,
      total_pages: Math.ceil(total / limitNum),
      per_page: limitNum,
    });
  } catch (error) {
    console.error("Error in GetSuppliers:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM suppliers WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier tidak ditemukan",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const CreateSupplier = async (req, res) => {
  try {
    const {
      supplier_code,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
    } = req.body;

    // Check if supplier code already exists
    const existingSupplier = await pool.query(
      `SELECT id FROM suppliers WHERE supplier_code = $1`,
      [supplier_code],
    );

    if (existingSupplier.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Supplier code already exists",
      });
    }

    const defaultStatus = "Active";

    await pool.query(
      `
            INSERT INTO suppliers (
                supplier_code,
                supplier_name,
                contact_person,
                phone,
                email,
                address,
                status
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            `,
      [
        supplier_code,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        defaultStatus,
      ],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "CREATE",
      "SUPPLIER",
      `Add Supplier ${supplier_name}`,
    );
    res.status(201).json({
      success: true,
      message: "Supplier added successfully",
    });
  } catch (error) {
    console.error("Error in CreateSupplier:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check if supplier can be deleted or inactivated
const checkSupplierUsage = async (supplierId) => {
  const result = await pool.query(
    `SELECT COUNT(*) as product_count FROM products WHERE supplier_id = $1`,
    [supplierId],
  );
  return parseInt(result.rows[0].product_count);
};

export const UpdateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name, contact_person, phone, email, address, status } =
      req.body;

    // Check if supplier exists
    const supplier = await pool.query(`SELECT * FROM suppliers WHERE id = $1`, [
      id,
    ]);
    if (supplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // If trying to deactivate (inactive), check if supplier is used in products
    if (status === "inactive") {
      const productCount = await checkSupplierUsage(id);
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate supplier because it is used in ${productCount} product(s). Please update or delete those products first.`,
          productCount: productCount,
        });
      }
    }

    let capitalizedStatus = status;
    if (status) {
      capitalizedStatus =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    await pool.query(
      `
            UPDATE suppliers
            SET
                supplier_name = $1,
                contact_person = $2,
                phone = $3,
                email = $4,
                address = $5,
                status = $6
            WHERE id = $7
            `,
      [
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        capitalizedStatus,
        id,
      ],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "UPDATE",
      "SUPPLIER",
      `Update Supplier ${supplier_name}`,
    );

    res.status(200).json({
      success: true,
      message: "Supplier berhasil diupdate",
    });
  } catch (error) {
    console.error("Error in UpdateSupplier:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const DeleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await pool.query(`SELECT * FROM suppliers WHERE id = $1`, [
      id,
    ]);

    if (supplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const supplierName = supplier.rows[0].supplier_name;

    const productCount = await checkSupplierUsage(id);

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier because it is used in ${productCount} product(s). Please update or delete those products first.`,
      });
    }

    await pool.query(`DELETE FROM suppliers WHERE id = $1`, [id]);

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "DELETE",
      "SUPPLIER",
      `Delete Supplier ${supplierName}`,
    );

    res.status(200).json({
      success: true,
      message: "Supplier berhasil dihapus",
    });
  } catch (error) {
    console.error("Error in DeleteSupplier:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get active suppliers only (for dropdown)
export const GetActiveSuppliers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, supplier_code, supplier_name 
             FROM suppliers 
             WHERE status = 'Active' 
             ORDER BY supplier_name ASC`,
    );

    const suppliers = result.rows.map((supplier) => ({
      ...supplier,
      status: supplier.status ? supplier.status.toLowerCase() : "inactive",
    }));

    return res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error in GetActiveSuppliers:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
