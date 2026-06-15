import express from "express";
import {
  GetDashboardStats,
  GetManagerDashboard,
  GetLowStockProducts,
  GetRecentActivities,
  GetStaffDashboard,
  GetStaffRecentMovements,
  GetWeeklyActivity,
  GetNotifications,
} from "../controllers/DashboardController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.get("/stats", VerifyToken, GetDashboardStats);
router.get("/manager", VerifyToken, GetManagerDashboard);
router.get("/low-stock", VerifyToken, GetLowStockProducts);
router.get("/recent-activities", VerifyToken, GetRecentActivities);
router.get("/staff", VerifyToken, GetStaffDashboard);
router.get("/staff/recent-movements", VerifyToken, GetStaffRecentMovements);
router.get("/weekly-activity", VerifyToken, GetWeeklyActivity);
router.get("/notifications", VerifyToken, GetNotifications);

export default router;
