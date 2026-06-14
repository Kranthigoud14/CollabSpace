import { getProjectMember } from "../services/rbac.service.js";
import Document from "../models/Document.model.js";
import Project from "../models/Project.model.js";

const activeUsersByDoc = {};

export const documentSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);

    // Join user rooms (notifications + projects)
    if (socket.user?._id) {
      const userId = socket.user._id.toString();

      socket.join(userId);

      try {
        const userProjects = await Project.find({
          "members.user": socket.user._id,
        }).select("_id");

        userProjects.forEach((p) => {
          socket.join(p._id.toString());
        });
      } catch (err) {
        console.error("Project join error:", err);
      }
    }

    // Broadcast active users
    const broadcastUsers = (documentId) => {
      const list = activeUsersByDoc[documentId] || [];

      const unique = [];
      const seen = new Set();

      for (const u of list) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          unique.push({
            userId: u.userId,
            name: u.name,
          });
        }
      }

      io.to(documentId).emit("document:users", unique);
    };

    // JOIN DOCUMENT
    const joinDocument = async (data) => {
      try {
        const documentId =
          typeof data === "string" ? data : data?.documentId;

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

          if (!member) {
            return socket.emit("error", "No access");
          }

          role = member.role;
        }

        socket.join(documentId);

        // CACHE USER CONTEXT (VERY IMPORTANT FOR SPEED)
        socket.data.documentId = documentId;
        socket.data.userId = socket.user._id.toString();
        socket.data.name = socket.user.name;
        socket.data.role = role;

        // active users tracking
        if (!activeUsersByDoc[documentId]) {
          activeUsersByDoc[documentId] = [];
        }

        activeUsersByDoc[documentId] = activeUsersByDoc[documentId].filter(
          (u) => u.socketId !== socket.id
        );

        activeUsersByDoc[documentId].push({
          socketId: socket.id,
          userId: socket.data.userId,
          name: socket.data.name,
        });

        broadcastUsers(documentId);

        socket.emit("joined_document", { documentId, role });
      } catch (err) {
        console.error(err);
        socket.emit("error", "Join failed");
      }
    };

    socket.on("join_document", joinDocument);

    // LEAVE
    socket.on("leave_document", (data) => {
      const documentId =
        typeof data === "string" ? data : data?.documentId;

      if (!documentId) return;

      socket.leave(documentId);

      if (activeUsersByDoc[documentId]) {
        activeUsersByDoc[documentId] =
          activeUsersByDoc[documentId].filter(
            (u) => u.socketId !== socket.id
          );

        broadcastUsers(documentId);
      }
    });

    // =========================
    // REALTIME EDITING (FIXED)
    // =========================
    socket.on("send_changes", (data) => {
      const { documentId, content } = data;

      if (!documentId) return;

      // FAST RBAC (NO DB CALL)
      if (socket.data.role === "viewer") {
        return socket.emit("error", "No edit permission");
      }

      // BROADCAST TO ALL INCLUDING SENDER
      io.to(documentId).emit("receive_changes", {
        documentId,
        content,
        user: socket.data.name,
      });
    });

    // typing
    socket.on("user:typing", ({ documentId }) => {
      socket.to(documentId).emit("user:typing", {
        user: socket.data.name,
      });
    });

    socket.on("user:stop-typing", ({ documentId }) => {
      socket.to(documentId).emit("user:stop-typing", {
        user: socket.data.name,
      });
    });

    // cursor
    socket.on("cursor:move", ({ documentId, position }) => {
      socket.to(documentId).emit("cursor:update", {
        userId: socket.data.userId,
        name: socket.data.name,
        position,
      });
    });

    // cleanup
    socket.on("disconnect", () => {
      Object.keys(activeUsersByDoc).forEach((docId) => {
        activeUsersByDoc[docId] = activeUsersByDoc[docId].filter(
          (u) => u.socketId !== socket.id
        );

        broadcastUsers(docId);
      });
    });
  });
};
