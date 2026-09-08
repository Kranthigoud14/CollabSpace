import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { getIO } from "../services/socket.service.js";
import path from "path";
import { validateUploadFile, extractContentFromFile } from "../services/fileUpload.service.js";
import { generatePDF, generateDOCX, generateTXT } from "../services/fileExport.service.js";

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
      const resolvedRole = getUserRole(project, req.user.userId);

      if (!resolvedRole) {
        return res.status(403).json({
          message: "Not a project member",
        });
      }

      role = resolvedRole;
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
 * GET DOCUMENTS (SECURED - USER ACCESS FILTERED)
 */
export const getDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;

    let query = {};
    if (projectId) {
      const proj = await Project.findById(projectId);
      if (!proj) {
        return res.status(404).json({ message: "Project not found" });
      }
      const role = getUserRole(proj, req.user.userId);
      if (!role) {
        return res.status(403).json({ message: "Not authorized to view documents in this project" });
      }
      query = { project: projectId };
    } else {
      const projects = await Project.find({
        $or: [
          { owner: req.user.userId },
          { "members.user": req.user.userId },
        ],
      }).select("_id");
      const projectIds = projects.map((p) => p._id);
      query = {
        $or: [
          { createdBy: req.user.userId },
          { project: { $in: projectIds } },
        ],
      };
    }

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
      $or: [
        { owner: req.user.userId },
        { "members.user": req.user.userId },
      ],
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

/**
 * UPLOAD DOCUMENT (PDF / DOCX / TXT)
 * Extracts text, creates normal CollabSpace document
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const ext = validateUploadFile(req.file);
    const { content } = await extractContentFromFile(
      req.file.buffer,
      ext,
      req.file.originalname
    );

    const parsedPath = path.parse(req.file.originalname);
    const title = (req.body?.title && req.body.title.trim()) || parsedPath.name || "Uploaded Document";
    const project = req.body?.project || null;

    if (project) {
      const proj = await Project.findById(project);
      if (!proj) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }
      const role = getUserRole(proj, req.user.userId);
      if (!role || role === "viewer") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to upload documents to this project",
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
      message: `Document uploaded: ${title}`,
    });

    const io = getIO();
    if (project) {
      io.to(project.toString()).emit("document_created", document);
    }

    await createNotification({
      user: req.user.userId,
      project,
      type: "DOCUMENT",
      message: `Document uploaded: ${title}`,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("uploadDocument error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to upload document",
    });
  }
};

/**
 * EXPORT DOCUMENT (PDF / DOCX / TXT)
 * Converts latest editor content to requested format
 */
export const exportDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = req.document || (await Document.findById(documentId));

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const format = (req.body?.format || req.query?.format || "txt").toLowerCase();
    const content = req.body?.content !== undefined ? req.body.content : document.content || "";
    const title = req.body?.title || document.title || "Document";

    // If editor sent newer content and user has edit rights, optionally save to DB
    if (req.body?.content !== undefined && (req.role === "owner" || req.role === "admin" || req.role === "editor")) {
      document.content = req.body.content;
      if (req.body?.title && (req.role === "owner" || req.role === "admin")) {
        document.title = req.body.title;
      }
      await document.save();
    }

    const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "_").trim() || "Document";

    if (format === "pdf") {
      const buffer = await generatePDF(title, content);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
      res.setHeader("Content-Length", buffer.length);
      return res.end(buffer);
    }

    if (format === "docx") {
      const buffer = await generateDOCX(title, content);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.docx"`);
      res.setHeader("Content-Length", buffer.length);
      return res.end(buffer);
    }

    if (format === "txt") {
      const buffer = generateTXT(title, content);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.txt"`);
      res.setHeader("Content-Length", buffer.length);
      return res.end(buffer);
    }

    return res.status(400).json({
      success: false,
      message: "Unsupported format. Supported formats: pdf, docx, txt",
    });
  } catch (error) {
    console.error("exportDocument error:", error);
    return res.status(500).json({
      success: false,
      message: `Export failed: ${error.message}`,
    });
  }
};