import Project from "../models/Project.model.js";
import Document from "../models/Document.model.js";
import Task from "../models/Task.model.js";
import Activity from "../models/Activity.model.js";

/**
 * GET /api/dashboard/stats
 * Aggregated dashboard metrics for the authenticated user
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ── Projects ────────────────────────────────────────────────
    // Projects where the user is a member OR owner
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { "members.user": userId },
      ],
    })
      .lean()
      .select("_id name description owner members createdAt");

    const projectIds = userProjects.map((p) => p._id);
    const totalProjects = userProjects.length;

    // ── Documents ───────────────────────────────────────────────
    const allDocuments = await Document.find({
      $or: [
        { createdBy: userId },
        { project: { $in: projectIds } },
      ],
    })
      .lean()
      .select("_id title project createdBy createdAt updatedAt");

    const totalDocuments = allDocuments.length;
    const activeDocuments = allDocuments.filter((d) => !!d.project).length;
    const personalDocuments = allDocuments.filter((d) => !d.project).length;

    // ── Tasks ───────────────────────────────────────────────────
    const allTasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { project: { $in: projectIds } },
      ],
    })
      .lean()
      .select("_id title status project assignedTo dueDate createdAt");

    const taskStats = {
      total: allTasks.length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      inProgress: allTasks.filter((t) => t.status === "in-progress").length,
      review: allTasks.filter((t) => t.status === "review").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
    };

    // Overdue tasks (past dueDate and not completed)
    const now = new Date();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
    ).length;

    // ── Recent Activity ─────────────────────────────────────────
    const recentActivities = await Activity.find({
      $or: [{ user: userId }, { project: { $in: projectIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email")
      .populate("project", "name")
      .lean();

    // ── Member metrics per project ───────────────────────────────
    const projectSummaries = userProjects.slice(0, 5).map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      memberCount: p.members?.length || 0,
      isOwner: p.owner?.toString() === userId,
      createdAt: p.createdAt,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        projects: {
          total: totalProjects,
          recent: projectSummaries,
        },
        documents: {
          total: totalDocuments,
          active: activeDocuments,
          personal: personalDocuments,
        },
        tasks: {
          ...taskStats,
          overdue: overdueTasks,
        },
        recentActivities,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard stats",
    });
  }
};
