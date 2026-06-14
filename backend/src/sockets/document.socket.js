import { getProjectMember } from "../services/rbac.service.js";
import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";

const activeUsersByDoc = {};
const latestContentByDoc = {};

const CURSOR_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f472b6",
  "#a78bfa",
];

const cursorColorForUser = (userId = "") => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

const normalizeProjectId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.projectId) return value.projectId.toString();
  return value.toString();
};

export const documentSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);

    // Auto-join user room + all their project rooms
    if (socket.user?._id) {
      const userId = socket.user._id.toString();
      socket.join(userId);

      try {
        const userProjects = await Project.find({
          $or: [
            { owner: socket.user._id },
            { "members.user": socket.user._id },
          ],
        }).select("_id");

        userProjects.forEach((p) => {
          socket.join(p._id.toString());
        });
      } catch (err) {
        console.error("Project join error:", err);
      }
    }

    const broadcastUsers = (documentId) => {
      const list = activeUsersByDoc[documentId] || [];
      const unique = [];
      const seen = new Set();

      for (const u of list) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          unique.push({ userId: u.userId, name: u.name });
        }
      }

      io.to(documentId).emit("document:users", unique);
    };

    // Project rooms for task real-time events
    socket.on("join_project", (data) => {
      const projectId = normalizeProjectId(data);
      if (projectId) socket.join(projectId);
    });

    socket.on("leave_project", (data) => {
      const projectId = normalizeProjectId(data);
      if (projectId) socket.leave(projectId);
    });

    // JOIN DOCUMENT
    socket.on("join_document", async (data) => {
      try {
        const documentId = typeof data === "string" ? data : data?.documentId;
        if (!documentId) return;

        const doc = await Document.findById(documentId);
        if (!doc) return socket.emit("error", "Document not found");

        let role = "viewer";

        if (!doc.project) {
          if (doc.createdBy.toString() !== socket.user._id.toString()) {
            return socket.emit("error", "No access");
          }
          role = "owner";
        } else {
          const member = await getProjectMember(
            doc.project.toString(),
            socket.user._id.toString()
          );
          if (!member) return socket.emit("error", "No access");
          role = member.role;
        }

        socket.join(documentId);

        socket.data.documentId = documentId;
        socket.data.userId = socket.user._id.toString();
        socket.data.name = socket.user.name;
        socket.data.role = role;

        if (!activeUsersByDoc[documentId]) activeUsersByDoc[documentId] = [];
        activeUsersByDoc[documentId] = activeUsersByDoc[documentId].filter(
          (u) => u.socketId !== socket.id
        );
        activeUsersByDoc[documentId].push({
          socketId: socket.id,
          userId: socket.data.userId,
          name: socket.data.name,
        });

        broadcastUsers(documentId);

        const content =
          latestContentByDoc[documentId] ?? doc.content ?? "";

        socket.emit("joined_document", { documentId, role });
        socket.emit("joined-document", { documentId, role });
        socket.emit("document_state", { documentId, content });
      } catch (err) {
        console.error("join_document error:", err);
        socket.emit("error", "Join failed");
      }
    });

    // LEAVE DOCUMENT
    socket.on("leave_document", (data) => {
      const documentId = typeof data === "string" ? data : data?.documentId;
      if (!documentId) return;

      socket.leave(documentId);

      if (socket.data.documentId === documentId) {
        socket.data.documentId = null;
        socket.data.role = null;
      }

      if (activeUsersByDoc[documentId]) {
        activeUsersByDoc[documentId] = activeUsersByDoc[documentId].filter(
          (u) => u.socketId !== socket.id
        );
        broadcastUsers(documentId);
      }
    });

    // REAL-TIME CONTENT SYNC
    socket.on("send_changes", (data) => {
      const { documentId, content } = data || {};

      if (!documentId || content === undefined) return;

      if (socket.data.documentId !== documentId) {
        return socket.emit("error", "Not joined in document");
      }

      if (socket.data.role === "viewer") {
        return socket.emit("error", "No edit permission");
      }

      latestContentByDoc[documentId] = content;

      const payload = {
        documentId,
        content,
        user: socket.data.name,
        sourceId: socket.id,
        timestamp: Date.now(),
      };

      socket.broadcast.to(documentId).emit("receive_changes", payload);
      socket.broadcast.to(documentId).emit("receive-changes", payload);
    });

    // TYPING INDICATORS
    socket.on("user:typing", ({ documentId }) => {
      if (!documentId || socket.data.documentId !== documentId) return;
      socket.to(documentId).emit("user:typing", {
        documentId,
        user: socket.data.name,
        userId: socket.data.userId,
      });
    });

    socket.on("user:stop-typing", ({ documentId }) => {
      if (!documentId || socket.data.documentId !== documentId) return;
      socket.to(documentId).emit("user:stop-typing", {
        documentId,
        user: socket.data.name,
        userId: socket.data.userId,
      });
    });

    // CURSOR POSITION
    socket.on("cursor:move", ({ documentId, position, selection }) => {
      if (!documentId || socket.data.documentId !== documentId) return;
      socket.to(documentId).emit("cursor:update", {
        documentId,
        userId: socket.data.userId,
        name: socket.data.name,
        color: cursorColorForUser(socket.data.userId),
        position,
        selection,
      });
    });

    // DISCONNECT CLEANUP
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      Object.keys(activeUsersByDoc).forEach((docId) => {
        activeUsersByDoc[docId] = activeUsersByDoc[docId].filter(
          (u) => u.socketId !== socket.id
        );
        broadcastUsers(docId);
      });
    });
  });
};
