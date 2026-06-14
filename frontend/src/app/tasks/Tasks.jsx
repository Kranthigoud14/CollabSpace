import { useEffect, useState, useRef } from "react";
import AppLayout from "../layout/AppLayout";
import { useTaskStore } from "../../store/task.store";
import { useProjectStore } from "../../store/project.store";
import { useAuthStore } from "../../store/auth.store";
import { connect } from "../../services/socket";
import { pushToast } from "../../components/ui/Toast";

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_COLUMNS = [
  {
    key: "todo",
    label: "To Do",
    color: "text-slate-300",
    dot: "bg-slate-400",
    badge: "bg-slate-900 border-slate-800 text-slate-400",
    empty: "No tasks yet",
  },
  {
    key: "in-progress",
    label: "In Progress",
    color: "text-cyan-400",
    dot: "bg-cyan-400",
    badge: "bg-slate-900 border-slate-800 text-cyan-400",
    empty: "Nothing in progress",
  },
  {
    key: "review",
    label: "Under Review",
    color: "text-amber-400",
    dot: "bg-amber-400",
    badge: "bg-slate-900 border-slate-800 text-amber-400",
    empty: "No tasks under review",
  },
  {
    key: "completed",
    label: "Completed",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    badge: "bg-slate-900 border-slate-800 text-emerald-400",
    empty: "No completed tasks",
  },
];

const STATUS_NEXT = {
  "todo": "in-progress",
  "in-progress": "review",
  "review": "completed",
  "completed": "todo",
};

const PRIORITY_STYLES = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const STATUS_BADGE = {
  "todo": "bg-slate-800 border-slate-700 text-slate-400",
  "in-progress": "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  "review": "bg-amber-500/10 border-amber-500/20 text-amber-400",
  "completed": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

const STATUS_LABEL = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "review": "Review",
  "completed": "Completed",
};

// ─── EMPTY MODAL STATE ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "",
  description: "",
  assignedTo: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
  project: "",
};

// ─── TASKS PAGE ────────────────────────────────────────────────────────────────
function Tasks() {
  const { user } = useAuthStore();
  const safeUser = user || JSON.parse(localStorage.getItem("user")) || {};

  const { projects, fetchProjects } = useProjectStore();
  const {
    tasks,
    fetchTasks,
    fetchProjectTasks,
    addTask,
    editTask,
    removeTask,
    subscribeSocket,
    unsubscribeSocket,
    loading,
  } = useTaskStore();

  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // null = create mode, task obj = edit mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // taskId
  const modalRef = useRef(null);

  // Helper to get project role for any project
  const getProjectUserRole = (proj) => {
    if (!proj) return "viewer";
    const memberRecord = proj?.members?.find(
      (m) => m?.user?._id === safeUser._id || m?.user === safeUser._id
    );
    return (
      memberRecord?.role ||
      (proj?.owner?._id === safeUser._id || proj?.owner === safeUser._id
        ? "owner"
        : "viewer")
    );
  };

  const currentProject = projects?.find((p) => p._id === selectedProjectId);
  const currentProjectRole = selectedProjectId === "all" ? "viewer" : getProjectUserRole(currentProject);

  // Can create tasks if owner/admin/editor of selected project OR (if all view) any project
  const canCreateTask =
    selectedProjectId !== "all"
      ? ["owner", "admin", "editor"].includes(currentProjectRole)
      : projects?.some((p) => ["owner", "admin", "editor"].includes(getProjectUserRole(p)));

  // Can write (inline shortcut at bottom of To Do column): owner/admin/editor in currently selected project
  const canWrite =
    selectedProjectId !== "all" &&
    ["owner", "admin", "editor"].includes(currentProjectRole);

  // Filter projects where user can write tasks
  const writableProjects = projects?.filter((p) =>
    ["owner", "admin", "editor"].includes(getProjectUserRole(p))
  ) || [];

  // Helper to check if task can be edited
  const getCanEditTask = (task) => {
    const taskProjId = typeof task.project === "string" ? task.project : task.project?._id;
    const taskProj = projects?.find((p) => p._id === taskProjId);
    const role = getProjectUserRole(taskProj);
    return ["owner", "admin", "editor"].includes(role);
  };

  // Helper to check if task can be deleted
  const getCanDeleteTask = (task) => {
    const taskProjId = typeof task.project === "string" ? task.project : task.project?._id;
    const taskProj = projects?.find((p) => p._id === taskProjId);
    const role = getProjectUserRole(taskProj);
    return ["owner", "admin"].includes(role);
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProjects();
    connect(); // ensure socket is live
  }, []);

  useEffect(() => {
    loadTasks();
    const projIds = projects?.map((p) => p._id) || [];
    subscribeSocket(selectedProjectId, projIds);
    return () => unsubscribeSocket(selectedProjectId, projIds);
  }, [selectedProjectId, projects]);

  const loadTasks = () => {
    if (selectedProjectId === "all") {
      fetchTasks();
    } else {
      fetchProjectTasks(selectedProjectId);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      ...EMPTY_FORM,
      status: "todo",
      project: selectedProjectId !== "all" ? selectedProjectId : "",
    });
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    const taskProjId = typeof task.project === "string" ? task.project : task.project?._id || "";
    setForm({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      project: taskProjId,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setForm(EMPTY_FORM);
  };

  // ── Save (create or edit) ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const targetProjectId = form.project || selectedProjectId;
      if (!targetProjectId || targetProjectId === "all") {
        pushToast("Select a project first to create a task.");
        setSaving(false);
        return;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
        project: targetProjectId,
      };

      if (editingTask) {
        // EDIT
        await editTask(editingTask._id, payload);
        pushToast("Task updated ✓");
      } else {
        // CREATE
        await addTask(payload);
        pushToast("Task created ✓");
      }
      closeModal();
      loadTasks();
    } catch (err) {
      console.error("Save task error:", err);
      pushToast(err?.response?.data?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status change handler ───────────────────────────────────────────────
  const handleStatusChange = async (task, newStatus) => {
    if (task.status === newStatus) return;

    const taskProjId = typeof task.project === "string" ? task.project : task.project?._id;
    const taskProj = projects?.find((p) => p._id === taskProjId);
    const roleInTaskProject = getProjectUserRole(taskProj);

    if (roleInTaskProject === "viewer") {
      pushToast("Viewers cannot change task status.");
      return;
    }

    if (roleInTaskProject === "editor") {
      // 1. Editor can only mark completed if they are the assignee
      if (newStatus === "completed" && task.status !== "completed") {
        const assigneeId = task.assignedTo?._id || task.assignedTo || null;
        if (assigneeId !== safeUser._id) {
          pushToast("Only the assignee can mark this task as completed.");
          return;
        }
      }
      // 2. Only owner/admin can reopen completed task
      if (task.status === "completed" && newStatus !== "completed") {
        pushToast("Only Owner or Admin can reopen completed tasks.");
        return;
      }
    }

    try {
      await editTask(task._id, { status: newStatus });
      pushToast(`Task moved to ${STATUS_LABEL[newStatus] || newStatus} ✓`);
    } catch (err) {
      pushToast(err?.response?.data?.message || "Failed to update status.");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (taskId) => {
    try {
      await removeTask(taskId);
      pushToast("Task deleted.");
      setDeleteConfirm(null);
    } catch (err) {
      pushToast(err?.response?.data?.message || "Failed to delete task.");
    }
  };

  // ── Column buckets ─────────────────────────────────────────────────────────
  const buckets = {
    "todo": (tasks || []).filter((t) => t.status === "todo"),
    "in-progress": (tasks || []).filter((t) => t.status === "in-progress"),
    "review": (tasks || []).filter((t) => t.status === "review"),
    "completed": (tasks || []).filter((t) => t.status === "completed" || t.status === "done"),
  };

  // Get active project structure for modal assignee filtering
  const activeModalProjectId = form.project || selectedProjectId;
  const activeModalProject = projects?.find((p) => p._id === activeModalProjectId);
  const activeModalProjectRole = getProjectUserRole(activeModalProject);

  // ── Task Card ──────────────────────────────────────────────────────────────
  const renderCard = (task) => {
    const isOverdue =
      task.dueDate &&
      task.status !== "completed" &&
      new Date(task.dueDate) < new Date();

    const canEdit = getCanEditTask(task);
    const canDelete = getCanDeleteTask(task);

    return (
      <div
        key={task._id}
        className="p-4 bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl shadow-md transition-all duration-200 group flex flex-col gap-3"
      >
        {/* Top row: project tag + priority */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {selectedProjectId === "all" && task.project && (
            <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider max-w-[110px] truncate">
              {typeof task.project === "string" ? "Project" : task.project?.name}
            </span>
          )}
          {task.priority && (
            <span
              className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto ${
                PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
              }`}
            >
              {task.priority}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-white text-sm font-bold leading-snug group-hover:text-indigo-300 transition-colors">
          {task.title}
        </h4>

        {/* Description snippet */}
        {task.description && (
          <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Assignee + Due Date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
            👤 {task.assignedTo?.name || "Unassigned"}
          </span>
          {task.dueDate && (
            <span
              className={`text-[9px] font-semibold flex items-center gap-1 ${
                isOverdue ? "text-red-400" : "text-slate-500"
              }`}
            >
              {isOverdue ? "⚠" : "📅"}{" "}
              {new Date(task.dueDate).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 gap-2">
          {/* Status Select dropdown */}
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task, e.target.value)}
            disabled={!canEdit}
            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border bg-slate-900 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed ${
              STATUS_BADGE[task.status] || STATUS_BADGE["todo"]
            }`}
          >
            <option value="todo" className="bg-slate-950 text-slate-400">To Do</option>
            <option value="in-progress" className="bg-slate-950 text-cyan-400">In Progress</option>
            <option value="review" className="bg-slate-950 text-amber-400">Under Review</option>
            <option value="completed" className="bg-slate-950 text-emerald-400">Completed</option>
          </select>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit — owner/admin/editor */}
            {canEdit && (
              <button
                onClick={() => openEditModal(task)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Edit
              </button>
            )}
            {/* Delete — owner/admin */}
            {canDelete && (
              <button
                onClick={() => setDeleteConfirm(task._id)}
                className="text-[10px] text-red-500 hover:text-red-400 font-medium"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Tasks</h1>
            <p className="text-slate-400 mt-1.5 text-sm font-medium">
              Manage and track all workspace tasks across projects.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Project filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Workspace:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
              >
                <option value="all">All Joined Projects</option>
                {projects?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Task button */}
            {canCreateTask && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <span className="text-lg leading-none">+</span>
                New Task
              </button>
            )}
          </div>
        </div>

        {/* ── Role hint banner when "all" view ─────────────────────────────── */}
        {selectedProjectId === "all" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-slate-400">
            <span className="text-indigo-400">ℹ</span>
            You are viewing tasks across all joined projects. You can create tasks for projects where you have write access.
          </div>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center justify-between px-4 py-3 bg-slate-950/30 border border-slate-800/60 rounded-xl"
            >
              <span className={`text-xs font-bold ${col.color} flex items-center gap-2`}>
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                {col.label}
              </span>
              <span className="text-white font-extrabold text-lg">{buckets[col.key]?.length ?? 0}</span>
            </div>
          ))}
        </div>

        {/* ── Kanban Board ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {STATUS_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="bg-slate-950/20 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[520px] shadow-lg"
            >
              {/* Column header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 px-1">
                <span className={`text-sm font-bold flex items-center gap-2 ${col.color}`}>
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  {col.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${col.badge}`}>
                  {buckets[col.key]?.length ?? 0}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                {loading ? (
                  <>
                    <div className="h-20 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
                    <div className="h-16 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse opacity-60" />
                  </>
                ) : buckets[col.key]?.length === 0 ? (
                  <div className="py-14 text-center text-slate-600 text-xs border border-dashed border-slate-800/60 rounded-xl flex flex-col items-center gap-2">
                    <span className="text-2xl opacity-30">
                      {col.key === "todo" ? "📋" : col.key === "in-progress" ? "⚡" : col.key === "review" ? "🔍" : "✅"}
                    </span>
                    {col.empty}
                  </div>
                ) : (
                  buckets[col.key].map(renderCard)
                )}
              </div>

              {/* Quick-add shortcut in To Do column */}
              {col.key === "todo" && canWrite && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-400 border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all"
                >
                  + Add task
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                {editingTask ? "Edit Task" : "Create New Task"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Project select (Create mode only when selectedProjectId === "all") */}
              {!editingTask && selectedProjectId === "all" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Project <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.project}
                    onChange={(e) => setForm((f) => ({ ...f, project: e.target.value, assignedTo: "" }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
                    required
                  >
                    <option value="" disabled>Select a project</option>
                    {writableProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter task title..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder-slate-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional task description..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder-slate-500 resize-none"
                />
              </div>

              {/* Row: Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Under Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              {/* Row: Assignee + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                    disabled={activeModalProjectRole === "editor"}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <option value="">Unassigned</option>
                    {activeModalProject?.members?.map((m) => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  {activeModalProjectRole === "editor" && (
                    <p className="text-[10px] text-slate-600 mt-1">Editors cannot assign tasks</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 transition-all [color-scheme:dark] cursor-pointer font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim() || (selectedProjectId === "all" && !editingTask && !form.project)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  {saving ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-slate-950 border border-red-900/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-lg font-extrabold text-white">Delete Task?</h3>
            <p className="text-slate-400 text-sm">
              This action cannot be undone. The task will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Tasks;
