import express from "express";
import {
    GetLocations,
    GetLocationById,
    GetActiveLocations,  
    CreateLocation,
    UpdateLocation,
    DeleteLocation
} from "../controllers/LocationController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();
router.get("/", VerifyToken, GetLocations);
router.get("/active", VerifyToken, GetActiveLocations);  
router.get("/:id", VerifyToken, GetLocationById);
router.post("/", VerifyToken, AdminOnly, CreateLocation);
router.put("/:id", VerifyToken, AdminOnly, UpdateLocation);
router.delete("/:id", VerifyToken, AdminOnly, DeleteLocation);

export default router;