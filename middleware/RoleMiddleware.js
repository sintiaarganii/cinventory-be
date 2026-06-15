import { ROLES } from "../utils/Roles.js";

export const AdminOnly = (req, res, next) => {
  if (req.role !== ROLES.ADMIN) {
    return res.status(403).json({
      message: "Akses hanya untuk Admin",
    });
  }

  next();
};

export const ManagerOnly = (req, res, next) => {
  if (req.role !== ROLES.MANAGER) {
    return res.status(403).json({
      message: "Akses hanya untuk Manager",
    });
  }

  next();
};

export const StaffOnly = (req, res, next) => {
  if (req.role !== ROLES.STAFF) {
    return res.status(403).json({
      message: "Akses hanya untuk Staff",
    });
  }

  next();
};

export const AdminOrStaff = (req, res, next) => {
  if (req.role === "Admin" || req.role === "Staff") {
    return next();
  }

  return res.status(403).json({
    message: "Akses ditolak",
  });
};
