import Activity from "../models/Activity.model.js";

/**
 * Log an activity event to the database.
 * Maps legacy camelCase param names (userId, projectId, etc.) to the
 * correct schema field names (user, project, document, task).
 */
export const logActivity = async ({
  userId,
  projectId = null,
  documentId = null,
  taskId = null,
  action,
  message = "",
}) => {
  try {
    const activity = await Activity.create({
      user: userId,
      project: projectId,
      document: documentId,
      task: taskId,
      action,
      message,
    });

    return activity;
  } catch (error) {
    console.error("Activity Log Error:", error);
    return null;
  }
};

/**
 * Fetch all activities for a specific project (newest first).
 */
export const getProjectActivities = async (projectId) => {
  return await Activity.find({ project: projectId })
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("document", "title")
    .populate("task", "title");
};

/**
 * Fetch all activities triggered by a specific user (newest first).
 */
export const getUserActivities = async (userId) => {
  return await Activity.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("project", "name")
    .populate("document", "title")
    .populate("task", "title");
};