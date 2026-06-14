import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import projectRoutes from "./routes/project.routes.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import taskRoutes from "./routes/task.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

/**
 * =========================
 * TRUST PROXY (RENDER FIX)
 * =========================
 */
app.set("trust proxy", 1);

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://collab-space-ten.vercel.app"
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/**
 * =========================
 * ROUTES
 * =========================
 */

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CollabSpace AI Backend Running",
  });
});

/**
 * =========================
 * 404 HANDLER
 * =========================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * =========================
 * GLOBAL ERROR HANDLER
 * =========================
 */
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

export default app;
