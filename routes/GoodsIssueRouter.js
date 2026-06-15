import express from "express";

import {
  GetGoodsIssues,
  GetGoodsIssueById,
  CreateGoodsIssue,
  ApproveGoodsIssue,
  RejectGoodsIssue,
} from "../controllers/GoodsIssueController.js";

import { VerifyToken } from "../middleware/AuthMiddleware.js";

import {
  AdminOnly,
  AdminOrStaff,
  ManagerOnly,
} from "../middleware/RoleMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, GetGoodsIssues);
router.get("/:id", VerifyToken, GetGoodsIssueById);
router.post("/", VerifyToken, AdminOrStaff, CreateGoodsIssue);
router.put("/approve/:id", VerifyToken, ManagerOnly, ApproveGoodsIssue);
router.put("/reject/:id", VerifyToken, ManagerOnly, RejectGoodsIssue);

export default router;
