import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";

/**
 * Check document access based on role
 */
export const requireDocumentRole = (action) => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id;

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      req.document = document;

      /**
       * CASE 1: PERSONAL DOCUMENT
       */
      if (!document.project) {
        if (document.createdBy.toString() !== req.user.userId) {
          return res.status(403).json({
            message: "Not allowed (personal document)",
          });
        }
        return next();
      }

      /**
       * CASE 2: PROJECT DOCUMENT → check role
       */
      const project = await Project.findById(document.project);

      if (!project) {
        // Fallback: If project does not exist, treat as a personal document
        if (document.createdBy.toString() !== req.user.userId) {
          return res.status(403).json({
            message: "Not allowed (orphaned document)",
          });
        }
        return next();
      }

      const member = project.members.find(
        (m) => m.user.toString() === req.user.userId
      );

      if (!member) {
        return res.status(403).json({
          message: "Not a project member",
        });
      }

      const role = member.role;

      /**
       * RULE ENGINE
       */
      const permissions = {
        read: ["owner", "admin", "editor", "viewer"],
        write: ["owner", "admin", "editor"],
        delete: ["owner", "admin"],
      };

      if (!permissions[action].includes(role)) {
        return res.status(403).json({
          message: `Access denied for ${action}`,
        });
      }

      req.project = project;
      req.role = role;

      next();
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
};