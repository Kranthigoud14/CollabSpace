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
  uploadDocument,
  extractDocumentContent,
  exportDocument,
} from "../controllers/document.controller.js";

import multer from "multer";
import authMiddleware from "../middleware/auth.middleware.js";
import { requireDocumentRole } from "../middleware/documentRole.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

/**
 * EXTRACT CONTENT (WITHOUT DIRECT PERSISTENCE)
 */
router.post("/extract", authMiddleware, upload.single("file"), extractDocumentContent);

/**
 * UPLOAD DOCUMENT (PDF / DOCX / TXT)
 */
router.post("/upload", authMiddleware, upload.single("file"), uploadDocument);

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

/**
 * EXPORT DOCUMENT (PDF / DOCX / TXT)
 */
router.post("/:id/export", authMiddleware, requireDocumentRole("read"), exportDocument);
router.get("/:id/export", authMiddleware, requireDocumentRole("read"), exportDocument);

export default router;