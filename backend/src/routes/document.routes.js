import express from "express";

import {
  createDocument,
  getDocuments,
  getUserDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  duplicateDocument,
  renameDocument,
} from "../controllers/document.controller.js";


import authMiddleware from "../middleware/auth.middleware.js";
import { requireDocumentRole } from "../middleware/documentRole.middleware.js";

const router = express.Router();

/**
 * CREATE DOCUMENT
 * Owner + Editor (handled inside controller RBAC)
 */
router.post("/", authMiddleware, createDocument);

/**
 * MY DOCUMENTS
 */
router.get("/my", authMiddleware, getUserDocuments);

/**
 * ALL DOCUMENTS (USER ACCESS FILTERED IN CONTROLLER)
 */
router.get("/", authMiddleware, getDocuments);

/**
 * PROJECT DOCUMENTS
 */
router.get("/project/:projectId", authMiddleware, getDocuments);

/**
 * GET SINGLE DOCUMENT (READ ACCESS)
 */
router.get(
  "/:id",
  authMiddleware,
  requireDocumentRole("read"),
  getDocumentById
);

/**
 * UPDATE DOCUMENT (WRITE ACCESS)
 */
router.put(
  "/:id",
  authMiddleware,
  requireDocumentRole("write"),
  (req, res, next) => { console.log("PUT /api/documents/:id hit", req.params.id); return updateDocument(req, res, next); }
);

/**
 * RENAME DOCUMENT (WRITE ACCESS)
 */
router.patch('/:id/rename', authMiddleware, requireDocumentRole('write'), renameDocument);
router.put('/:id/rename', authMiddleware, requireDocumentRole('write'), renameDocument);

/**
 * DELETE DOCUMENT (DELETE ACCESS)
 */
router.delete(
  "/:id",
  authMiddleware,
  requireDocumentRole('delete'),
  (req, res) => { console.log("DELETE /api/documents/:id hit", req.params.id); return deleteDocument(req, res); }
);

/**
 * DUPLICATE DOCUMENT
 */
router.post("/:id/duplicate", authMiddleware, duplicateDocument);

export default router;