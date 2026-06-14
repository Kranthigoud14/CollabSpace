import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

import { initSocket } from "./services/socket.service.js";
import { documentSocket } from "./sockets/document.socket.js";
import { socketAuth } from "./middleware/socketAuth.middleware.js";

const PORT = process.env.PORT || 5000;

// =========================
// CREATE HTTP SERVER
// =========================
const server = http.createServer(app);

// =========================
// SOCKET.IO SETUP
// =========================
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://collab-space-ten.vercel.app",
    ],
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

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
