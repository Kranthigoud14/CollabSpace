import Project from "../models/Project.model.js";
import Task from "../models/Task.model.js";
import Document from "../models/Document.model.js";

export const requireRole = (...allowedRoles) => {
  // Support both requireRole('owner','admin') and requireRole(['owner','admin'])
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
  return async (req, res, next) => {
    try {
      let projectId =
        req.body.project ||
        req.params.projectId ||
        req.projectId;

      let documentId = req.body.document || req.params.documentId;

      let document = null;

      // Try to resolve document and project from req.params.id if not set
      if (!projectId && !documentId && req.params.id) {
        const isTaskRoute = req.originalUrl.includes("/tasks");
        const isDocRoute = req.originalUrl.includes("/documents");

        if (isTaskRoute) {
          const task = await Task.findById(req.params.id);
          if (task) {
            projectId = task.project;
            documentId = task.document;
          }
        } else if (isDocRoute) {
          documentId = req.params.id;
        }
      }

      // If documentId is resolved, retrieve the document and try to extract project
      if (documentId) {
        document = await Document.findById(documentId);
        if (document && document.project) {
          projectId = document.project;
        }
      }

      // Handle personal documents (documents with no project)
      if (document && !document.project) {
        if (document.createdBy && document.createdBy.toString() === req.user.userId.toString()) {
          return next();
        } else {
          return res.status(403).json({
            message: "Access denied (personal document/task)",
          });
        }
      }

      if (!projectId) {
        return res.status(400).json({
          message: "Project ID or Document ID required",
        });
      }

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      const member = project.members.find(
        (m) => m.user.toString() === req.user.userId.toString()
      );

      if (!member) {
        return res.status(403).json({
          message: "Not a project member",
        });
      }

      if (!roles.includes(member.role)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
};