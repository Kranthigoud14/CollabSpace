import Notification from "../models/Notification.model.js";

/**
 * GET NOTIFICATIONS (USER ONLY)
 */
export const getNotifications = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const notifications = await Notification.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * MARK AS READ (OWNER ONLY)
 */
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // 🔐 RBAC: only owner of notification
    if (notification.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE NOTIFICATION (OWNER ONLY)
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await Notification.deleteMany({ user: req.user.userId });
    return res.status(200).json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE SINGLE NOTIFICATION (OWNER ONLY)
 */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    if (notification.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await notification.deleteOne();
    return res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * MARK ALL AS READ (USER ONLY)
 */
export const markAllAsRead = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};