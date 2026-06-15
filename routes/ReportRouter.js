import express from "express";

import {
  GetGoodsReceiptReport,
  GetGoodsIssueReport,
  GetStockReport,
} from "../controllers/ReportController.js";

import { VerifyToken } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.get("/goods-receipts", VerifyToken, GetGoodsReceiptReport);
router.get("/goods-issues", VerifyToken, GetGoodsIssueReport);
router.get("/stock", VerifyToken, GetStockReport);

export default router;
