import { getProjectMember } from "../services/rbac.service.js";
import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";

// Global map to track active participants in document rooms (documentId -> array of { socketId, userId, name })
const activeUsersByDoc = {};

export const documentSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log("User connected to socket:", socket.id, socket.user?._id);

    if (socket.user?._id) {
      const userIdStr = socket.user._id.toString();
      // Join user-specific notification room
      socket.join(userIdStr);

      // Join rooms for all projects the user is a member of
      try {
        const userProjects = await Project.find({
          "members.user": socket.user._id,
        }).select("_id");
        
        userProjects.forEach((proj) => {
          socket.join(proj._id.toString());
        });
      } catch (err) {
        console.error("Error joining project rooms for user:", err);
      }
    }

    // Helper to broadcast active users in a document room
    const broadcastActiveUsers = (documentId) => {
      const usersList = activeUsersByDoc[documentId] || [];
      // Deduplicate by userId
      const uniqueUsers = [];
      const seen = new Set();
      for (const u of usersList) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          uniqueUsers.push({ userId: u.userId, name: u.name });
        }
      }
      io.to(documentId).emit("document:users", uniqueUsers);
    };

    // HELPER: Join Document Room
    const handleJoinDocument = async (data) => {
      try {
        let documentId, projectId;
        if (typeof data === "string") {
          documentId = data;
        } else if (data && typeof data === "object") {
          documentId = data.documentId;
          projectId = data.projectId;
        }

        if (!documentId) return;

        // Fetch document to verify access and project association
        const doc = await Document.findById(documentId);
        if (!doc) {
          return socket.emit("error", "Document not found");
        }

        let role = "viewer";

        if (!doc.project) {
          // Personal document -> check if owner
          if (doc.createdBy.toString() !== socket.user._id.toString()) {
            return socket.emit("error", "Access denied (personal document)");
          }
          role = "owner";
        } else {
          // Project document -> check membership
          const member = await getProjectMember(doc.project.toString(), socket.user._id.toString());
          if (!member) {
            return socket.emit("error", "Access denied. Not a project member");
          }
          role = member.role;
        }

        socket.join(documentId);
        
        // Add to active users map
        if (!activeUsersByDoc[documentId]) {
          activeUsersByDoc[documentId] = [];
        }
        // Remove old occurrences of this socket
        activeUsersByDoc[documentId] = activeUsersByDoc[documentId].filter((u) => u.socketId !== socket.id);
        activeUsersByDoc[documentId].push({
          socketId: socket.id,
          userId: socket.user._id.toString(),
          name: socket.user.name,
        });

        broadcastActiveUsers(documentId);

        socket.emit("joined_document", { documentId, role });
        socket.emit("joined-document", { documentId, role }); // hyphenated fallback
      } catch (err) {
        console.error("Error joining document channel:", err);
        socket.emit("error", "Failed to join document");
      }
    };

    // Listen to both event styles
    socket.on("join_document", handleJoinDocument);
    socket.on("join-document", handleJoinDocument);

    // HELPER: Leave Document Room
    const handleLeaveDocument = (data) => {
      let documentId = typeof data === "string" ? data : data?.documentId;
      if (documentId) {
        socket.leave(documentId);
        
        // Remove from active users map
        if (activeUsersByDoc[documentId]) {
          activeUsersByDoc[documentId] = activeUsersByDoc[documentId].filter((u) => u.socketId !== socket.id);
          broadcastActiveUsers(documentId);
        }
      }
    };
    socket.on("leave_document", handleLeaveDocument);
    socket.on("leave-document", handleLeaveDocument);

    // HELPER: Live Editing Changes
    const handleSendChanges = (data) => {
      const documentId = data?.documentId;
      const content = data?.content;
      if (documentId) {
        socket.to(documentId).emit("receive_changes", {
          documentId,
          content,
          user: socket.user.name,
        });
        socket.to(documentId).emit("receive-changes", {
          documentId,
          content,
          user: socket.user.name,
        });
      }
    };
    socket.on("send_changes", handleSendChanges);
    socket.on("send-changes", handleSendChanges);

    // HELPER: Typing Indicators
    socket.on("user:typing", (payload) => {
      const { documentId } = payload;
      if (documentId) {
        socket.to(documentId).emit("user:typing", {
          documentId,
          user: socket.user.name,
        });
      }
    });

    socket.on("user:stop-typing", (payload) => {
      const { documentId } = payload;
      if (documentId) {
        socket.to(documentId).emit("user:stop-typing", {
          documentId,
          user: socket.user.name,
        });
      }
    });

    // Helper: Deterministic color for users
    const getDeterministicColor = (userId) => {
      const colors = [
        "#f59e0b", // Amber
        "#10b981", // Emerald
        "#3b82f6", // Blue
        "#8b5cf6", // Violet
        "#ec4899", // Pink
        "#14b8a6", // Teal
        "#ef4444", // Red
        "#6366f1", // Indigo
      ];
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    };

    // HELPER: Cursor Sync
    socket.on("cursor:move", (payload) => {
      const { documentId, position, selection } = payload;
      if (documentId && socket.user?._id) {
        socket.to(documentId).emit("cursor:update", {
          documentId,
          userId: socket.user._id.toString(),
          name: socket.user.name,
          position,
          selection,
          color: getDeterministicColor(socket.user._id.toString()),
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from socket:", socket.id);
      // Clean up user from all document rooms
      Object.keys(activeUsersByDoc).forEach((docId) => {
        const initialLen = activeUsersByDoc[docId].length;
        activeUsersByDoc[docId] = activeUsersByDoc[docId].filter((u) => u.socketId !== socket.id);
        if (activeUsersByDoc[docId].length !== initialLen) {
          broadcastActiveUsers(docId);
        }
      });
    });
  });
};