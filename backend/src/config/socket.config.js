import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join project room
    socket.on("join_project", (projectId) => {
      socket.join(projectId);
    });

    // Leave project room
    socket.on("leave_project", (projectId) => {
      socket.leave(projectId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

// export getter
export const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
};