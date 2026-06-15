import express from "express";
import {
  GetUsers,
  CreateUser,
  UpdateUser,
  ToggleUserStatus,
} from "../controllers/UsersController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, AdminOnly, GetUsers);
router.post("/", VerifyToken, AdminOnly, CreateUser);
router.put("/:id", VerifyToken, AdminOnly, UpdateUser);
router.patch("/:id/toggle-status", VerifyToken, AdminOnly, ToggleUserStatus);
export default router;
