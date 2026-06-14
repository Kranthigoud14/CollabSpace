import Notification from "../models/Notification.model.js";
import { getIO } from "./socket.service.js";

/**
 * CREATE + SEND NOTIFICATION
 */
export const createNotification = async ({
  user,
  project = null,
  type,
  message,
}) => {
  try {
    // 1. SAVE TO DB
    const notification = await Notification.create({
      user,
      project,
      type,
      message,
    });

    // 2. SOCKET EMIT
    const io = getIO();

    console.log("NOTIFICATION SENT:", message);

io.to(user.toString()).emit(
  "notification",
  notification
);

    return notification;
  } catch (error) {
    console.error("Notification error:", error.message);
  }
};