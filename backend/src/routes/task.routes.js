import express from "express";

import {
  createTask,
  getAllTasks,
  getProjectTasks,
  getDocumentTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/projectRole.middleware.js";

const router = express.Router();

/**
 * CREATE TASK → OWNER / ADMIN / EDITOR ONLY
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["owner", "admin", "editor"]),
  createTask
);

/**
 * GET ALL TASKS (SAFE FILTERED IN CONTROLLER)
 */
router.get("/", authMiddleware, getAllTasks);

/**
 * PROJECT TASKS → ALL MEMBERS
 */
router.get(
  "/project/:projectId",
  authMiddleware,
  requireRole(["owner", "admin", "editor", "viewer"]),
  getProjectTasks
);

/**
 * DOCUMENT TASKS → ALL MEMBERS
 */
router.get(
  "/document/:documentId",
  authMiddleware,
  requireRole(["owner", "admin", "editor", "viewer"]),
  getDocumentTasks
);

/**
 * SINGLE TASK VIEW
 */
router.get("/:id", authMiddleware, getTaskById);

/**
 * UPDATE TASK → OWNER / ADMIN / EDITOR ONLY
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole(["owner", "admin", "editor"]),
  updateTask
);

/**
 * DELETE TASK → OWNER / ADMIN ONLY
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["owner", "admin"]),
  deleteTask
);

export default router;