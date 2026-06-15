import { pool } from "../config/db.js";
import { LogActivity } from "../middleware/ActivityLogger.js";

export const GetLocations = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 5 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = [];
    let params = [];
    let index = 1;

    if (search && search.trim()) {
      whereClause.push(`location_name ILIKE $${index}`);
      params.push(`%${search.trim()}%`);
      index++;
    }

    const whereSQL =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) as total FROM locations ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
            SELECT id, location_code, location_name, description, status, created_at
            FROM locations 
            ${whereSQL}
            ORDER BY id DESC
            LIMIT $${index} OFFSET $${index + 1}
        `;

    params.push(limitNum, offset);
    const result = await pool.query(dataQuery, params);

    const locations = result.rows.map((location) => ({
      ...location,
      status: location.status ? location.status.toLowerCase() : "inactive",
    }));

    return res.status(200).json({
      success: true,
      message: "Data lokasi berhasil diambil",
      locations: locations,
      total: total,
      current_page: pageNum,
      total_pages: Math.ceil(total / limitNum),
      per_page: limitNum,
    });
  } catch (error) {
    console.error("Error in GetLocations:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM locations WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location tidak ditemukan",
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

export const CreateLocation = async (req, res) => {
  try {
    const { location_code, location_name, description } = req.body;

    // Check if location code already exists
    const existingLocation = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1`,
      [location_code],
    );

    if (existingLocation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Location code already exists",
      });
    }

    const defaultStatus = "Active";

    await pool.query(
      `
            INSERT INTO locations (
                location_code,
                location_name,
                description,
                status
            )
            VALUES ($1,$2,$3,$4)
            `,
      [location_code, location_name, description, defaultStatus],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "CREATE",
      "LOCATION",
      `Add Location ${location_name}`,
    );
    res.status(201).json({
      success: true,
      message: "Location added successfully",
    });
  } catch (error) {
    console.error("Error in CreateLocation:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check if location can be deleted or inactivated
const checkLocationUsage = async (locationId) => {
  const result = await pool.query(
    `SELECT COUNT(*) as product_count FROM products WHERE location_id = $1`,
    [locationId],
  );
  return parseInt(result.rows[0].product_count);
};

export const UpdateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { location_name, description, status } = req.body;

    // Check if location exists
    const location = await pool.query(`SELECT * FROM locations WHERE id = $1`, [
      id,
    ]);
    if (location.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // If trying to deactivate (inactive), check if location is used in products
    if (status === "inactive") {
      const productCount = await checkLocationUsage(id);
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate location because it is used in ${productCount} product(s). Please update or delete those products first.`,
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
            UPDATE locations
            SET
                location_name = $1,
                description = $2,
                status = $3
            WHERE id = $4
            `,
      [location_name, description, capitalizedStatus, id],
    );
    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "UPDATE",
      "LOCATION",
      `Update Location ${location_name}`,
    );

    res.status(200).json({
      success: true,
      message: "Location berhasil diupdate",
    });
  } catch (error) {
    console.error("Error in UpdateLocation:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const DeleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await pool.query(`SELECT * FROM locations WHERE id = $1`, [
      id,
    ]);

    if (location.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const locationName = location.rows[0].location_name;

    const productCount = await checkLocationUsage(id);

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location because it is used in ${productCount} product(s). Please update or delete those products first.`,
      });
    }

    await pool.query(`DELETE FROM locations WHERE id = $1`, [id]);

    await LogActivity(
      req.user?.id || null,
      req.user?.username || "Admin",
      "DELETE",
      "LOCATION",
      `Delete Location ${locationName}`,
    );

    res.status(200).json({
      success: true,
      message: "Location berhasil dihapus",
    });
  } catch (error) {
    console.error("Error in DeleteLocation:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get active locations only (for dropdown)
export const GetActiveLocations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, location_code, location_name 
             FROM locations 
             WHERE status = 'Active' 
             ORDER BY location_name ASC`,
    );

    const locations = result.rows.map((location) => ({
      ...location,
      status: location.status ? location.status.toLowerCase() : "inactive",
    }));

    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error in GetActiveLocations:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
