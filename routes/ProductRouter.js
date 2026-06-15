import express from "express";

import {
  GetProducts,
  GetProductById,
  CreateProduct,
  UpdateProduct,
  DeleteProduct,
} from "../controllers/ProductController.js";

import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();
router.get("/", VerifyToken, GetProducts);
router.get("/:id", VerifyToken, GetProductById);
router.post("/", VerifyToken, AdminOnly, CreateProduct);
router.put("/:id", VerifyToken, AdminOnly, UpdateProduct);
router.delete("/:id", VerifyToken, AdminOnly, DeleteProduct);

export default router;
