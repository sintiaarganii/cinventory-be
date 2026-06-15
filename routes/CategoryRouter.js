import express from "express";

import {
  GetCategories,
  GetCategoryById,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
} from "../controllers/CategoryController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, GetCategories);
router.get("/:id", VerifyToken, GetCategoryById);
router.post("/", VerifyToken, AdminOnly, CreateCategory);
router.put("/:id", VerifyToken, AdminOnly, UpdateCategory);
router.delete("/:id", VerifyToken, AdminOnly, DeleteCategory);

export default router;
