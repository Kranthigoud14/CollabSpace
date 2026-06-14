import Project from "../models/Project.model.js";
import { v4 as uuidv4 } from "uuid";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { getIO } from "../services/socket.service.js";

const createInviteCode = () => uuidv4().replace(/-/g, "").substring(0, 8);

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Project name is required" });

    const project = await Project.create({
      name,
      description: description || "",
      owner: req.user.userId,
      inviteCode: createInviteCode(),
      members: [{ user: req.user.userId, role: "owner" }],
    });

    await logActivity({
      userId: req.user.userId,
      projectId: project._id,
      action: "PROJECT_CREATED",
      message: `Project created: ${name}`,
    });

    return res.status(201).json({ project });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    })
      .sort({ createdAt: -1 })
      .populate("owner members.user", "name email");

    return res.json({ projects });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "owner members.user",
      "name email"
    );

    if (!project) return res.status(404).json({ message: "Project not found" });
    // debug: log members and current user for troubleshooting 403s
    console.log('getProjectById members:', project.members);
    console.log('getProjectById req.user:', req.user);

    const isMember = project.members.some((m) => {
      if (!m || !m.user) return false;
      // m.user may be populated object or ObjectId
      if (typeof m.user === "string") return m.user === req.user.userId.toString();
      if (m.user._id) return m.user._id.toString() === req.user.userId.toString();
      if (typeof m.user.toString === "function") return m.user.toString() === req.user.userId.toString();
      return false;
    });

    if (!isMember) return res.status(403).json({ message: "Access denied. Not a project member" });

    return res.json({ project });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Only owner can update project" });
    }

    project.name = req.body.name || project.name;
    project.description = req.body.description || project.description;

    const updated = await project.save();

    await logActivity({
      userId: req.user.userId,
      projectId: project._id,
      action: "PROJECT_UPDATED",
      message: `Project updated: ${project.name}`,
    });

    const io = getIO();
    io.to(project._id.toString()).emit("project_updated", updated);

    return res.json({ project: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Only owner can delete project" });
    }

    await project.deleteOne();

    await logActivity({
      userId: req.user.userId,
      projectId: project._id,
      action: "PROJECT_DELETED",
      message: `Project deleted: ${project.name}`,
    });

    const io = getIO();
    io.to(project._id.toString()).emit("project_deleted", project._id);

    return res.json({ message: "Project deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const joinProject = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) return res.status(400).json({ message: "inviteCode is required" });

    const project = await Project.findOne({ inviteCode });

    if (!project) return res.status(404).json({ message: "Project not found" });

    const already = project.members.some(
      (m) => m.user.toString() === req.user.userId.toString()
    );

    if (already) return res.status(400).json({ message: "Already a member" });

    project.members.push({ user: req.user.userId, role: "viewer" });
    await project.save();

    await logActivity({
      userId: req.user.userId,
      projectId: project._id,
      action: "PROJECT_JOINED",
      message: `Joined project: ${project.name}`,
    });

    await createNotification({
      user: req.user.userId,
      project: project._id,
      type: "PROJECT",
      message: `You joined project: ${project.name}`,
    });

    const io = getIO();
    io.to(project._id.toString()).emit("member_joined", { user: req.user.userId });

    return res.json({ project });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const currentMember = project.members.find(
      (m) => m.user.toString() === req.user.userId.toString()
    );

    if (!currentMember) {
      return res.status(403).json({ message: "Not a project member" });
    }

    const currentRole = currentMember.role;

    // Authorization check
    if (currentRole !== "owner" && currentRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to change roles" });
    }

    const targetMember = project.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({ message: "Member not found in project" });
    }

    if (targetMember.role === "owner") {
      return res.status(403).json({ message: "Cannot modify project owner's role" });
    }

    if (currentRole === "admin") {
      if (targetMember.role === "admin") {
        return res.status(403).json({ message: "Admins cannot modify other admins" });
      }
      if (role === "admin" || role === "owner") {
        return res.status(403).json({ message: "Admins cannot assign admin or owner roles" });
      }
    }

    targetMember.role = role;
    await project.save();

    const updatedProject = await Project.findById(id).populate("owner members.user", "name email");

    const io = getIO();
    io.to(id.toString()).emit("project_updated", updatedProject);

    await logActivity({
      userId: req.user.userId,
      projectId: id,
      action: "MEMBER_ROLE_UPDATED",
      message: `Updated member role to ${role}`,
    });

    res.json({ project: updatedProject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const currentMember = project.members.find(
      (m) => m.user.toString() === req.user.userId.toString()
    );

    if (!currentMember) {
      return res.status(403).json({ message: "Not a project member" });
    }

    const currentRole = currentMember.role;

    // Authorization check
    if (currentRole !== "owner" && currentRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to remove members" });
    }

    const targetMember = project.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({ message: "Member not found in project" });
    }

    if (targetMember.role === "owner") {
      return res.status(403).json({ message: "Cannot remove project owner" });
    }

    if (currentRole === "admin") {
      if (targetMember.role === "admin") {
        return res.status(403).json({ message: "Admins cannot remove other admins" });
      }
    }

    project.members = project.members.filter(
      (m) => m.user.toString() !== userId.toString()
    );
    await project.save();

    const updatedProject = await Project.findById(id).populate("owner members.user", "name email");

    const io = getIO();
    io.to(id.toString()).emit("project_updated", updatedProject);
    io.to(id.toString()).emit("member_removed", { userId });

    await logActivity({
      userId: req.user.userId,
      projectId: id,
      action: "MEMBER_REMOVED",
      message: `Removed member from project`,
    });

    res.json({ project: updatedProject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
