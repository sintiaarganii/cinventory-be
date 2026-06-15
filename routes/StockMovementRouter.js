import express from "express";
import {
    GetStockMovements,
    GetProductMovement,
    GetStockMovementSummary
} from "../controllers/StockMovementController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, GetStockMovements);
router.get("/summary", VerifyToken, GetStockMovementSummary);
router.get("/product/:id", VerifyToken, GetProductMovement);

export default router;