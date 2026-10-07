import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

import { initSocket } from "./services/socket.service.js";
import { documentSocket } from "./sockets/document.socket.js";
import { socketAuth } from "./middleware/socketAuth.middleware.js";

const PORT = process.env.PORT || 5000;

const getAllowedSocketOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.VITE_FRONTEND_URL,
    "http://localhost:5173",
    "https://localhost:5173",
    "https://collab-space-ten.vercel.app",
    "https://collabspace-iuji.onrender.com",
  ].filter(Boolean);

  return [...new Set(configuredOrigins)];
};

// =========================
// CREATE HTTP SERVER
// =========================
const server = http.createServer(app);

// =========================
// SOCKET.IO SETUP
// =========================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedSocketOrigins();

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Socket origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Initialize socket logic
initSocket(io);
io.use(socketAuth);
documentSocket(io);

// =========================
// CONNECT DB FIRST, THEN START SERVER
// =========================
connectDB()
  .then(() => {
    console.log("MongoDB Connected");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
