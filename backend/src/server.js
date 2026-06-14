import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

import { initSocket } from "./services/socket.service.js";
import { documentSocket } from "./sockets/document.socket.js";
import { socketAuth } from "./middleware/socketAuth.middleware.js";

connectDB();


const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Initialize sockets and middleware
initSocket(io);
io.use(socketAuth);
documentSocket(io);


/**
 * START SERVER
 */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});