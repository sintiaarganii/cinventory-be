import express from "express";

import { Login, Me } from "../controllers/AuthController.js";

import { VerifyToken } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.post("/login", Login);
router.get("/me", VerifyToken, Me);

export default router;
