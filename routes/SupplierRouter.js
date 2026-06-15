import express from "express";
import {
    GetSuppliers,
    GetSupplierById,
    GetActiveSuppliers,  
    CreateSupplier,
    UpdateSupplier,
    DeleteSupplier
} from "../controllers/SupplierController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import { AdminOnly } from "../middleware/RoleMiddleware.js";

const router = express.Router();

router.get("/", VerifyToken, GetSuppliers);
router.get("/active", VerifyToken, GetActiveSuppliers);  
router.get("/:id", VerifyToken, GetSupplierById);
router.post("/", VerifyToken, AdminOnly, CreateSupplier);
router.put("/:id", VerifyToken, AdminOnly, UpdateSupplier);
router.delete("/:id", VerifyToken, AdminOnly, DeleteSupplier);

export default router;