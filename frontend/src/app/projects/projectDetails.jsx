import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import { useDocumentStore } from "../../store/document.store";
import { useTaskStore } from "../../store/task.store";
import { useAuthStore } from "../../store/auth.store";
import api from "../../api/axios";

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const safeUser = user || JSON.parse(localStorage.getItem("user")) || {};

  const { documents, fetchMyDocs, addDocument } = useDocumentStore();
  const { tasks, fetchProjectTasks, addTask, editTask } = useTaskStore();

  const [project, setProject] = useState(null);
  const [docTitle, setDocTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [projectLoading, setProjectLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    loadProject();
    fetchMyDocs();
    fetchProjectTasks(id);
  }, [id]);

  const loadProject = async () => {
    try {
      setProjectLoading(true);
      const res = await api.get(`/projects/${id}`);
      setProject(res?.data?.project || null);
    } catch (err) {
      console.log("project load error:", err);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!project?.inviteCode) return;
    navigator.clipboard.writeText(project.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    try {
      const res = await addDocument({
        title: docTitle.trim(),
        content: "",
        project: id,
      });
      setDocTitle("");
      const doc = res?.document || res?.data || res || null;
      if (doc?._id) {
        navigate(`/app/documents/${doc._id}`);
      }
      fetchMyDocs();
    } catch (err) {
      console.log("create doc error:", err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setAddingTask(true);
      await addTask({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        project: id,
        assignedTo: taskAssignee || undefined,
        status: "todo",
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssignee("");
      fetchProjectTasks(id);
    } catch (err) {
      console.error("Create task error:", err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus =
      task.status === "todo"
        ? "in-progress"
        : task.status === "in-progress"
        ? "review"
        : task.status === "review"
        ? "completed"
        : "todo";

    try {
      if (myRole === "editor") {
        if (nextStatus === "completed" && task.assignedTo?._id !== safeUser._id && task.assignedTo !== safeUser._id) {
          alert("Only the assignee can mark this task as completed.");
          return;
        }
        if (task.status === "completed" || task.status === "done") {
          alert("Only Owner or Admin can reopen completed tasks.");
          return;
        }
      }
      await editTask(task._id, { status: nextStatus });
      fetchProjectTasks(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      const res = await api.put(`/projects/${id}/members/${userId}`, { role: newRole });
      setProject(res?.data?.project || null);
    } catch (err) {
      console.error("Failed to update role:", err);
      alert(err.response?.data?.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(res?.data?.project || null);
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  // Find user role
  const memberRecord = project?.members?.find(
    (m) => m?.user?._id === safeUser._id || m?.user === safeUser._id
  );
  const myRole = memberRecord?.role || (project?.owner?._id === safeUser._id || project?.owner === safeUser._id ? "owner" : "viewer");
  const isViewer = myRole === "viewer";

  const filteredDocs = (documents || []).filter((doc) => {
    if (!doc?.project) return false;
    if (typeof doc.project === "string") return doc.project === id;
    return doc.project?._id === id;
  });

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {projectLoading ? (
          <div className="h-44 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        ) : (
          /* HEADER PANEL */
          <div className="bg-gradient-to-r from-slate-900/80 to-indigo-950/20 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
            <div className="space-y-2 max-w-xl">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                Workspace ({myRole})
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
                {project?.name}
              </h1>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {project?.description || "Collaborative MERN project workspace."}
              </p>
            </div>

            {/* Invite code */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center min-w-[160px] shadow-inner">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Invite Code</span>
              <span className="text-white font-mono font-bold text-lg mt-1 select-all">{project?.inviteCode}</span>
              <button
                onClick={handleCopyCode}
                className="mt-2 text-xs font-semibold px-3 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-slate-300 border border-slate-750 transition-all"
              >
                {copied ? "Copied! ✓" : "Copy Code"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: DOCUMENTS AND MEMBER LIST (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Documents */}
            <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📄</span> Project Files ({filteredDocs.length})
                </h3>
              </div>

              {/* CREATE DOCUMENT */}
              {!isViewer && (
                <form onSubmit={handleCreateDocument} className="flex gap-2">
                  <input
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Create new project document..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:bg-slate-900/60 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!docTitle.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    Create
                  </button>
                </form>
              )}

              {/* DOCUMENT GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocs.length === 0 ? (
                  <div className="sm:col-span-2 py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                    No documents inside this workspace yet.
                  </div>
                ) : (
                  filteredDocs.map((doc) => (
                    <Link
                      key={doc._id}
                      to={`/app/documents/${doc._id}`}
                      className="p-4 bg-slate-900/30 rounded-xl border border-slate-855 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300 group"
                    >
                      <h4 className="text-white font-bold text-sm truncate group-hover:text-indigo-400 transition-colors">
                        {doc.title || "Untitled Document"}
                      </h4>
                      <p className="text-slate-500 text-xs mt-1">
                        Updated {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString()}
                      </p>
                      <span className="text-[10px] text-indigo-400 font-semibold block mt-3">Open Editor →</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Project Members List */}
            <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>👥</span> Project Team
              </h3>
              
              {projectLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project?.members?.map((m, index) => {
                    const mUser = m?.user || {};
                    const mName = mUser?.name || "Team Member";
                    const mEmail = mUser?.email || "No email";
                    const mRole = m?.role || "viewer";

                    const isTargetAdminOrOwner = mRole === "admin" || mRole === "owner";
                    const canIModifyThisMember = (myRole === "owner" || myRole === "admin") && mUser._id !== safeUser._id && mUser._id !== project?.owner?._id && mUser._id !== project?.owner && !(myRole === "admin" && isTargetAdminOrOwner);

                    return (
                      <div
                        key={mUser?._id || index}
                        className="p-3 bg-slate-900/40 rounded-xl border border-slate-850 flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <div className="text-white font-semibold text-xs truncate">{mName}</div>
                          <div className="text-slate-500 text-[10px] truncate mt-0.5">{mEmail}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canIModifyThisMember ? (
                            <>
                              <select
                                value={mRole}
                                onChange={(e) => handleUpdateMemberRole(mUser._id, e.target.value)}
                                className="text-[10px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 font-semibold focus:outline-none cursor-pointer"
                              >
                                {myRole === "owner" && <option value="admin">admin</option>}
                                <option value="editor">editor</option>
                                <option value="viewer">viewer</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(mUser._id)}
                                className="text-[10px] text-red-500 hover:text-red-400 font-bold ml-1 transition-all"
                                title="Remove member"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                              mRole === "owner"
                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                : mRole === "admin"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : mRole === "editor"
                                ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                                : "bg-slate-800 border-slate-755 text-slate-400"
                            }`}>
                              {mRole}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: TASK MANAGEMENT SECTION (Span 1) */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[480px]">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✅</span> Workspace Tasks ({tasks.length})
              </h3>

              {/* CREATE TASK INLINE FORM */}
              {!isViewer && (
                <form onSubmit={handleCreateTask} className="space-y-3 p-3 bg-slate-900/50 rounded-xl border border-slate-850">
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs outline-none focus:border-indigo-500 transition-all"
                  />
                  <input
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs outline-none focus:border-indigo-500 transition-all"
                  />
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    disabled={myRole === "editor"}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                  >
                    <option value="">
                      {myRole === "editor" ? "Unassigned (Editors cannot assign tasks)" : "Assign Member (optional)"}
                    </option>
                    {project?.members?.map((m) => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={addingTask || !taskTitle.trim()}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    {addingTask ? "Adding..." : "Add Project Task"}
                  </button>
                </form>
              )}

              {/* TASK LIST */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 text-xs border border-dashed border-slate-850 rounded-xl">
                    No active tasks
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-3 bg-slate-900/40 rounded-xl border border-slate-850 hover:border-slate-750 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate">
                          <h5 className={`font-bold text-xs text-white truncate ${task.status === 'completed' || task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                            {task.title}
                          </h5>
                          {task.description && (
                            <p className="text-slate-500 text-[10px] mt-0.5 truncate leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          {task.assignedTo && (
                            <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                              👤 Assigned: {typeof task.assignedTo === 'string' ? 'User' : task.assignedTo?.name}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border transition-colors ${
                            task.status === "completed" || task.status === "done"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : task.status === "review"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : task.status === "in-progress"
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                              : "bg-slate-800 border-slate-750 text-slate-400"
                          }`}
                        >
                          {task.status}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-855 text-center">
              <Link to="/app/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                Open Tasks Manager →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProjectDetails;