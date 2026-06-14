import express from "express";

import {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  joinProject,
  updateMemberRole,
  removeMember,
} from "../controllers/project.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET ALL USER PROJECTS
 */
router.get("/", authMiddleware, getUserProjects);

/**
 * CREATE PROJECT
 */
router.post("/", authMiddleware, createProject);

/**
 * JOIN PROJECT
 */
router.post("/join", authMiddleware, joinProject);

/**
 * GET PROJECT BY ID (must be member)
 */
router.get("/:id", authMiddleware, getProjectById);

/**
 * UPDATE PROJECT (OWNER ONLY)
 */
router.put("/:id", authMiddleware, updateProject);

/**
 * DELETE PROJECT (OWNER ONLY)
 */
router.delete("/:id", authMiddleware, deleteProject);

/**
 * UPDATE MEMBER ROLE (OWNER + ADMIN ONLY)
 */
router.put("/:id/members/:userId", authMiddleware, updateMemberRole);

/**
 * REMOVE MEMBER (OWNER + ADMIN ONLY)
 */
router.delete("/:id/members/:userId", authMiddleware, removeMember);

export default router;