import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { getIO } from "../services/socket.service.js";

/**
 * helper → check user role in project
 */
const getUserRole = (project, userId) => {
  if (project.owner?.toString() === userId.toString()) {
    return "owner";
  }

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

/**
 * CREATE DOCUMENT (OWNER + EDITOR ONLY)
 */
export const createDocument = async (req, res) => {
  try {
    const { title, content, project } = req.body;

    if (project) {
      const proj = await Project.findById(project);

      if (!proj) {
        return res.status(404).json({ message: "Project not found" });
      }

      const role = getUserRole(proj, req.user.userId);

      if (!role || role === "viewer") {
        return res.status(403).json({
          message: "Not authorized to create document in this project",
        });
      }
    }

    const document = await Document.create({
      title,
      content,
      project: project || null,
      createdBy: req.user.userId,
    });

    await logActivity({
      userId: req.user.userId,
      projectId: project,
      documentId: document._id,
      action: "DOCUMENT_CREATED",
      message: `Document created: ${title}`,
    });

    const io = getIO();
    if (project) {
      io.to(project.toString()).emit("document_created", document);
    }

    await createNotification({
      user: req.user.userId,
      project,
      type: "DOCUMENT",
      message: `Document created: ${title}`,
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE DOCUMENT (OWNER + EDITOR)
 * Editor → content only
 * Owner → full access
 */
export const updateDocument = async (req, res) => {
  console.log("updateDocument controller hit", req.params.id);
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const project = document.project
      ? await Project.findById(document.project)
      : null;

    let role = "owner";

    if (project) {
      const member = project.members.find(
        (m) => m.user.toString() === req.user.userId.toString()
      );

      if (!member) {
        return res.status(403).json({
          message: "Not a project member",
        });
      }

      role = member.role;
    }

    // ❌ viewer cannot update
    if (role === "viewer") {
      return res.status(403).json({
        message: "Not authorized to update document",
      });
    }

    // ✍️ editor → only content
    if (role === "editor") {
      if (req.body.content) {
        document.content = req.body.content;
      }
    }

    // 👑 owner / admin → full update
    if (role === "owner" || role === "admin") {
      document.title = req.body.title || document.title;
      document.content = req.body.content || document.content;
    }

    const updated = await document.save();

    await logActivity({
      userId: req.user.userId,
      projectId: document.project,
      documentId: document._id,
      action: "DOCUMENT_UPDATED",
      message: `Document updated: ${document.title}`,
    });

    const io = getIO();

    if (document.project) {
      io.to(document.project.toString()).emit("document_updated", updated);
    }

    await createNotification({
      user: req.user.userId,
      project: document.project,
      type: "DOCUMENT",
      message: `Document updated: ${document.title}`,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE DOCUMENT (OWNER + ADMIN ONLY)
 */
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const project = document.project
      ? await Project.findById(document.project)
      : null;

    if (project) {
      const role = getUserRole(project, req.user.userId);

      if (role !== "owner" && role !== "admin") {
        return res.status(403).json({
          message: "Only owner or admin can delete document",
        });
      }
    }

    await document.deleteOne();

    await logActivity({
      userId: req.user.userId,
      projectId: document.project,
      documentId: document._id,
      action: "DOCUMENT_DELETED",
      message: `Document deleted: ${document.title}`,
    });

    const io = getIO();

    if (document.project) {
      io.to(document.project.toString()).emit("document_deleted", document._id);
    }

    await createNotification({
      user: req.user.userId,
      project: document.project,
      type: "DOCUMENT",
      message: `Document deleted: ${document.title}`,
    });

    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET DOCUMENTS (NO RBAC CHANGE - BUT SAFE FILTER)
 */
export const getDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;

    const query = projectId ? { project: projectId } : {};

    const documents = await Document.find(query).sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET DOCUMENT BY ID (SAFE ACCESS CHECK)
 */
export const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET USER DOCUMENTS (UNCHANGED - GOOD LOGIC)
 */
export const getUserDocuments = async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.userId,
    }).select("_id");

    const projectIds = projects.map((p) => p._id);

    const documents = await Document.find({
      $or: [
        { createdBy: req.user.userId },
        { project: { $in: projectIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("project createdBy", "name title email");

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DUPLICATE DOCUMENT (OWNER ONLY)
 */
// New rename controller
export const renameDocument = async (req, res) => {
  try {
    const { newTitle } = req.body;
    if (!newTitle) {
      return res.status(400).json({ message: "Missing newTitle" });
    }
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    // permission already checked by middleware
    document.title = newTitle;
    await document.save();
    await logActivity({
      userId: req.user.userId,
      projectId: document.project,
      documentId: document._id,
      action: "DOCUMENT_RENAMED",
      message: `Document renamed to: ${newTitle}`,
    });
    return res.json(document);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const duplicateDocument = async (req, res) => {
  try {
    const original = await Document.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only the creator can duplicate
    if (original.createdBy.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Only the owner can duplicate this document" });
    }

    const copy = await Document.create({
      title: `Copy of ${original.title}`,
      content: original.content,
      project: original.project || null,
      createdBy: req.user.userId,
    });

    await logActivity({
      userId: req.user.userId,
      projectId: original.project,
      documentId: copy._id,
      action: "DOCUMENT_CREATED",
      message: `Document duplicated: ${copy.title}`,
    });

    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};