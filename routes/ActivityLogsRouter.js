import express from "express";
import { GetActivityLogs } from "../Controllers/ActivityLogsController.js";

const router = express.Router();

router.get("/", GetActivityLogs);

export default router;
