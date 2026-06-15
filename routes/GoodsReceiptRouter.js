import express from "express";
import {
    GetGoodsReceipts,
    GetGoodsReceiptById,
    CreateGoodsReceipt,
    ApproveGoodsReceipt,
    RejectGoodsReceipt
} from "../controllers/GoodsReceiptController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly, AdminOrStaff, ManagerOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, GetGoodsReceipts);
router.get("/:id", VerifyToken, GetGoodsReceiptById);  
router.post("/", VerifyToken, AdminOrStaff, CreateGoodsReceipt);
router.put("/approve/:id", VerifyToken, ManagerOnly, ApproveGoodsReceipt);
router.put("/reject/:id", VerifyToken, ManagerOnly, RejectGoodsReceipt);

export default router;