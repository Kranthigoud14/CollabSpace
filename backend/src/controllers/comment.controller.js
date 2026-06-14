import Comment from "../models/Comment.model.js";
import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";
import { getIO } from "../services/socket.service.js";

// =========================
// HELPER: Resolve user's project role from a document
// =========================
const resolveProjectRole = async (documentId, userId) => {
  try {
    const doc = await Document.findById(documentId).lean();
    if (!doc || !doc.project) return null;

    const project = await Project.findById(doc.project).lean();
    if (!project) return null;

    // Check if creator of the document
    if (doc.createdBy?.toString() === userId) return "owner";

    const member = project.members.find(
      (m) => m.user?.toString() === userId
    );
    return member?.role || null;
  } catch {
    return null;
  }
};

// =========================
// CREATE COMMENT
// =========================
export const createComment = async (req, res) => {
  try {
    const { document, text } = req.body;

    const comment = await Comment.create({
      document,
      text,
      user: req.user.userId,
    });

    // Populate user info before emitting
    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("replies.user", "name email");

    try {
      const io = getIO();
      io.to(document.toString()).emit("comment:new", populatedComment);
    } catch (err) {
      console.error("Socket emit failed in comment creation:", err.message);
    }

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment: populatedComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET COMMENTS OF DOCUMENT
// =========================
export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      document: req.params.documentId,
    })
      .populate("user", "name email")
      .populate("replies.user", "name email");

    res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET SINGLE COMMENT
// =========================
export const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("user", "name email")
      .populate("replies.user", "name email");

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    res.status(200).json({
      success: true,
      comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE COMMENT (RBAC FIXED)
// =========================
export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // 🔐 RBAC: only comment owner OR project owner/editor can update
    const isCommentOwner = comment.user.toString() === req.user.userId;

    // Resolve project role dynamically from the document
    const projectRole = await resolveProjectRole(
      comment.document,
      req.user.userId
    );
    const hasEditAccess =
      projectRole === "owner" ||
      projectRole === "admin" ||
      projectRole === "editor";

    if (!isCommentOwner && !hasEditAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    // allow update
    if (req.body.text) {
      comment.text = req.body.text;
    }

    if (req.body.resolved !== undefined) {
      comment.resolved = req.body.resolved;
    }

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("replies.user", "name email");

    try {
      const io = getIO();
      io.to(comment.document.toString()).emit("comment:updated", populated);
    } catch (err) {
      console.error("Socket emit failed in comment update:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// DELETE COMMENT (RBAC FIXED)
// =========================
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // 🔐 RBAC: comment owner OR project owner/admin/editor can delete
    const isCommentOwner = comment.user.toString() === req.user.userId;

    const projectRole = await resolveProjectRole(
      comment.document,
      req.user.userId
    );
    const hasDeleteAccess =
      projectRole === "owner" ||
      projectRole === "admin" ||
      projectRole === "editor";

    if (!isCommentOwner && !hasDeleteAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    const docId = comment.document.toString();
    const commentId = comment._id.toString();

    await comment.deleteOne();

    try {
      const io = getIO();
      io.to(docId).emit("comment:deleted", commentId);
    } catch (err) {
      console.error("Socket emit failed in comment deletion:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// RESOLVE / UNRESOLVE COMMENT
// =========================
export const resolveComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // 🔐 RBAC: comment owner or project owner/admin/editor can resolve
    const isCommentOwner = comment.user.toString() === req.user.userId;

    const projectRole = await resolveProjectRole(
      comment.document,
      req.user.userId
    );
    const hasResolveAccess =
      projectRole === "owner" ||
      projectRole === "admin" ||
      projectRole === "editor";

    if (!isCommentOwner && !hasResolveAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to resolve this comment",
      });
    }

    const resolved =
      req.body.resolved !== undefined ? !!req.body.resolved : true;

    comment.resolved = resolved;

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("replies.user", "name email");

    try {
      const io = getIO();
      io.to(comment.document.toString()).emit("comment:resolved", populated);
    } catch (err) {
      console.error("Socket emit failed in comment resolve:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: resolved ? "Comment resolved" : "Comment marked unresolved",
      comment: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// ADD COMMENT REPLY
// =========================
export const addCommentReply = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res
        .status(400)
        .json({ success: false, message: "Reply text is required" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    comment.replies.push({
      user: req.user.userId,
      text,
      createdAt: new Date(),
    });

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate("user", "name email")
      .populate("replies.user", "name email");

    try {
      const io = getIO();
      io.to(comment.document.toString()).emit("comment:updated", populated);
    } catch (err) {
      console.error("Socket emit failed in comment reply:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      comment: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};