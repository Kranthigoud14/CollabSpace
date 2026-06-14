import express from "express";

import {
  createComment,
  getComments,
  getCommentById,
  updateComment,
  deleteComment,
  resolveComment,
  addCommentReply,
} from "../controllers/comment.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();


// CREATE COMMENT
router.post("/", authMiddleware, createComment);


//  GET ALL COMMENTS FOR A DOCUMENT
router.get("/document/:documentId", authMiddleware, getComments);


//  GET SINGLE COMMENT
router.get("/:id", authMiddleware, getCommentById);


//  UPDATE COMMENT
router.put("/:id", authMiddleware, updateComment);


// DELETE COMMENT
router.delete("/:id", authMiddleware, deleteComment);


// (IMPORTANT FOR NOTION STYLE)
router.patch("/:id/resolve", authMiddleware, resolveComment);

// REPLY TO COMMENT
router.post("/:id/reply", authMiddleware, addCommentReply);

export default router;