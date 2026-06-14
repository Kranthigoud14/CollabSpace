import Task from "../models/Task.model.js";
import Project from "../models/Project.model.js";

import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { getIO } from "../services/socket.service.js";

/**
 * Helper: get role (includes project owner)
 */
const getUserRole = (project, userId) => {
  if (project.owner?.toString() === userId.toString()) {
    return "owner";
  }

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

/**
 * Validate due date is today or future
 */
const validateDueDate = (dueDate) => {
  if (!dueDate) return null;

  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return "Invalid due date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  if (due < today) {
    return "Due date cannot be in the past";
  }

  return null;
};

const emitToProject = (io, projectId, event, payload) => {
  if (!projectId) return;
  io.to(projectId.toString()).emit(event, payload);
};

/**
 * Helper: check access
 */
const requireProjectAccess = (project, userId) => {
  const role = getUserRole(project, userId);
  if (!role) return null;
  return role;
};

/**
 * CREATE TASK (OWNER + EDITOR ONLY)
 */
export const createTask = async (req, res) => {
  try {
    const {
      project,
      document,
      title,
      description,
      assignedTo,
      dueDate,
      status,
      priority,
    } = req.body;

    if ((!project && !document) || (project && document)) {
      return res.status(400).json({
        message: "Provide exactly ONE of project or document",
      });
    }

    const dueDateError = validateDueDate(dueDate);
    if (dueDateError) {
      return res.status(400).json({ message: dueDateError });
    }

    let role = null;

    if (project) {
      const proj = await Project.findById(project);

      if (!proj) {
        return res.status(404).json({ message: "Project not found" });
      }

      role = requireProjectAccess(proj, req.user.userId);

      if (!role) {
        return res.status(403).json({ message: "Not a project member" });
      }

      if (!["owner", "admin", "editor"].includes(role)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const task = await Task.create({
      project: project || null,
      document: document || null,
      title,
      description,
      assignedTo,
      dueDate: dueDate || null,
      status: status || "todo",
      priority: priority || "medium",
    });

    await logActivity({
      userId: req.user.userId,
      projectId: project,
      documentId: document,
      taskId: task._id,
      action: "TASK_CREATED",
      message: `Task created: ${title}`,
    });

    const io = getIO();

    if (project) {
      emitToProject(io, project, "task_created", task);
    }

    if (assignedTo) {
      await createNotification({
        user: assignedTo,
        project,
        type: "TASK",
        message: `New task assigned: ${title}`,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE TASK (OWNER + ADMIN + EDITOR)
 */
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.project) {
      const proj = await Project.findById(task.project);

      const role = requireProjectAccess(proj, req.user.userId);

      if (!role) {
        return res.status(403).json({ message: "Not a project member" });
      }

      if (!["owner", "admin", "editor"].includes(role)) {
        return res.status(403).json({ message: "No permission to update task" });
      }

      // RBAC Rules for Editor
      if (role === "editor") {
        // 1. Editor cannot assign or reassign task
        if (req.body.assignedTo !== undefined && req.body.assignedTo?.toString() !== task.assignedTo?.toString()) {
          return res.status(403).json({ message: "Editors cannot assign or reassign tasks" });
        }

        // 2. Editor can only mark completed if they are the assignee
        if (req.body.status === "completed" && task.status !== "completed") {
          const assigneeId = task.assignedTo ? task.assignedTo.toString() : null;
          if (assigneeId !== req.user.userId) {
            return res.status(403).json({ message: "Only the assignee, admin, or owner can mark a task as completed" });
          }
        }

        // 3. Reopen task rule: Only owner/admin can reopen completed task
        if (task.status === "completed" && req.body.status !== undefined && req.body.status !== "completed") {
          return res.status(403).json({ message: "Only Owner or Admin can reopen completed tasks" });
        }
      }
    }

    if (req.body.dueDate !== undefined) {
      const dueDateError = validateDueDate(req.body.dueDate);
      if (dueDateError) {
        return res.status(400).json({ message: dueDateError });
      }
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    await logActivity({
      userId: req.user.userId,
      projectId: updated.project,
      documentId: updated.document,
      taskId: updated._id,
      action: "TASK_UPDATED",
      message: `Task updated: ${updated.title}`,
    });

    const io = getIO();

    if (updated.project) {
      emitToProject(io, updated.project, "task_updated", updated);
    }

    if (updated.assignedTo) {
      await createNotification({
        user: updated.assignedTo,
        project: updated.project,
        type: "TASK",
        message: `Task updated: ${updated.title}`,
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE TASK (OWNER + ADMIN ONLY)
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.project) {
      const proj = await Project.findById(task.project);

      const role = requireProjectAccess(proj, req.user.userId);

      if (!role) {
        return res.status(403).json({ message: "Not a project member" });
      }

      if (role !== "owner" && role !== "admin") {
        return res.status(403).json({
          message: "Only owner or admin can delete task",
        });
      }
    }

    await Task.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user.userId,
      projectId: task.project,
      documentId: task.document,
      taskId: task._id,
      action: "TASK_DELETED",
      message: `Task deleted: ${task.title}`,
    });

    const io = getIO();

    if (task.project) {
      emitToProject(io, task.project, "task_deleted", task._id);
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL TASKS (SECURED)
 * only tasks from user projects
 */
export const getAllTasks = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.userId },
        { "members.user": req.user.userId },
      ],
    }).select("_id");

    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
    })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("project", "name");

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET TASK BY ID (SECURED)
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email"
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.project) {
      const proj = await Project.findById(task.project);

      const role = requireProjectAccess(proj, req.user.userId);

      if (!role) {
        return res.status(403).json({
          message: "Not a project member",
        });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET PROJECT TASKS (SECURED)
 */
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const role = requireProjectAccess(project, req.user.userId);

    if (!role) {
      return res.status(403).json({ message: "Not a project member" });
    }

    const tasks = await Task.find({ project: projectId })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email");

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET DOCUMENT TASKS (SECURED)
 */
export const getDocumentTasks = async (req, res) => {
  try {
    const { documentId } = req.params;

    const tasks = await Task.find({ document: documentId })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email");

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};