import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", authMiddleware, getDashboardStats);

export default router;
