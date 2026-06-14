import express from "express";

import {
  getNotifications,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
  markAllAsRead,
} from "../controllers/notification.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// GET NOTIFICATIONS
router.get("/", authMiddleware, getNotifications);

// MARK ALL AS READ
router.put("/read-all", authMiddleware, markAllAsRead);

// MARK AS READ
router.put("/:id/read", authMiddleware, markAsRead);

// DELETE NOTIFICATION
router.delete("/", authMiddleware, deleteAllNotifications);
router.delete("/:id", authMiddleware, deleteNotification);

export default router;