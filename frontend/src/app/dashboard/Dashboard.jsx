import { useEffect, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { useAuthStore } from "../../store/auth.store";
import { useProjectStore } from "../../store/project.store";
import { useDocumentStore } from "../../store/document.store";
import { useTaskStore } from "../../store/task.store";
import { useNotificationStore } from "../../store/notification.store";
import { Link } from "react-router-dom";

function Dashboard() {
  const { user } = useAuthStore();
  const safeUser = user || JSON.parse(localStorage.getItem("user")) || { name: "Developer" };

  // ── helpers ──
  const wordCount = (html) => {
    if (!html) return 0;
    return html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const secs = Math.floor((Date.now() - new Date(date)) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };


  const { projects, fetchProjects, joinProjectByCode, loading: projectsLoading } = useProjectStore();
  const { documents, fetchMyDocs, loading: docsLoading } = useDocumentStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState({ success: null, message: "" });

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    fetchProjects();
    fetchMyDocs();
    fetchTasks();
    fetchNotifications();
  }, []);

  const handleQuickJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setJoining(true);
      setJoinStatus({ success: null, message: "" });
      const res = await joinProjectByCode(inviteCode.trim());
      setJoinStatus({
        success: true,
        message: `Successfully joined ${res?.project?.name || "the project"}!`,
      });
      setInviteCode("");
      fetchProjects();
    } catch (err) {
      console.error(err);
      setJoinStatus({
        success: false,
        message: err?.response?.data?.message || "Invalid invite code or already a member.",
      });
    } finally {
      setJoining(false);
    }
  };

  const totalProjects = projects?.length || 0;
  const totalPersonalDocs = (documents || []).filter((d) => !d?.project).length;
  const totalProjectDocs = (documents || []).filter((d) => !!d?.project).length;
  const totalTasks = tasks?.length || 0;
  const unreadNotifs = (notifications || []).filter((n) => !n.isRead).length;

  const stats = [
    {
      title: "Active Projects",
      value: totalProjects,
      desc: "Team workrooms",
      icon: "📁",
      color: "from-indigo-600/20 to-indigo-500/10 border-indigo-500/20 hover:shadow-indigo-500/5",
      link: "/app/projects",
    },
    {
      title: "Personal Documents",
      value: totalPersonalDocs,
      desc: "Private sandbox",
      icon: "📄",
      color: "from-cyan-600/20 to-cyan-500/10 border-cyan-500/20 hover:shadow-cyan-500/5",
      link: "/app/documents",
    },
    {
      title: "Project Documents",
      value: totalProjectDocs,
      desc: "Collaborative files",
      icon: "👥",
      color: "from-violet-600/20 to-violet-500/10 border-violet-500/20 hover:shadow-violet-500/5",
      link: "/app/documents",
    },
    {
      title: "Assigned Tasks",
      value: totalTasks,
      desc: "Action items",
      icon: "✅",
      color: "from-emerald-600/20 to-emerald-500/10 border-emerald-500/20 hover:shadow-emerald-500/5",
      link: "/app/tasks",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-indigo-950/20 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />

          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Welcome back, <span className="bg-gradient-to-r from-indigo-300 via-violet-200 to-white bg-clip-text text-transparent">{safeUser.name}</span> 👋
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-medium">
              {today} • {totalProjects > 0 ? `You are active in ${totalProjects} project workspaces.` : "Let's get started by creating a workspace."}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((item) => (
            <Link
              to={item.link}
              key={item.title}
              className={`group flex flex-col justify-between bg-gradient-to-br ${item.color} border rounded-2xl p-5 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{item.title}</span>
                <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]">{item.icon}</span>
              </div>
              <div className="mt-4">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">{item.value}</h2>
                <p className="text-slate-500 text-xs font-medium mt-1">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Middle row: Activity Feed & Quick Join */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects (LEFT COLUMN - Span 1) */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[350px]">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📁</span> Recent Projects
              </h3>

              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/50 animate-pulse" />
                  ))}
                </div>
              ) : projects?.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                  No projects joined yet
                </div>
              ) : (
                <div className="space-y-3">
                  {(projects || []).slice(0, 4).map((p) => (
                    <Link
                      key={p._id}
                      to={`/app/projects/${p._id}`}
                      className="block p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="text-white font-semibold text-sm group-hover:text-indigo-400 transition-colors truncate">
                            {p.name}
                          </div>
                          <div className="text-slate-500 text-xs truncate mt-0.5">
                            {p.description || "No description"}
                          </div>
                        </div>
                        <div className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 capitalize">
                          {p.owner?._id === safeUser._id || p.owner === safeUser._id ? "Owner" : "Member"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <Link
                to="/app/projects"
                className="w-full py-2.5 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 text-sm font-semibold border border-slate-850 hover:border-slate-750 transition-all"
              >
                Create Workspace
              </Link>
            </div>
          </div>

          {/* Recent Documents (RIGHT COLUMN - Span 2) */}
          <div className="lg:col-span-2 bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl min-h-[350px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📄</span> Recent Documents
              </h3>
              <Link
                to="/app/documents"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                View all →
              </Link>
            </div>

            {docsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-900/60 rounded-xl border border-slate-800/50 animate-pulse" />
                ))}
              </div>
            ) : (documents || []).length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-slate-500 text-sm">No documents found.</p>
                <Link
                  to="/app/documents"
                  className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Create your first document →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(documents || [])
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                  .slice(0, 6)
                  .map((d) => {
                    const projectName = typeof d.project === "object" ? d.project?.name : null;
                    const words = wordCount(d.content);
                    return (
                      <Link
                        key={d._id}
                        to={`/app/documents/${d._id}`}
                        className="flex items-center justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-200 group"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="text-white font-semibold text-sm truncate group-hover:text-indigo-400 transition-colors">
                            {d.title || "Untitled Document"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {projectName ? (
                              <span className="text-[9px] text-violet-400 font-bold px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 uppercase">
                                {projectName}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500 font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/40 uppercase">
                                Personal
                              </span>
                            )}
                            <span className="text-slate-600 text-[10px]">
                              {words} words
                            </span>
                            <span className="text-slate-600 text-[10px]">
                              {timeAgo(d.updatedAt || d.createdAt)}
                            </span>
                          </div>
                        </div>
                        <span className="text-indigo-400 text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          Open →
                        </span>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Join and Notification Card Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Join Workspace Card */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>⚡</span> Join Workspace
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Have an invite code from a teammate? Enter it below to join their workspace immediately.
              </p>

              <form onSubmit={handleQuickJoin} className="flex gap-2">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite code (e.g. 660f4e3c)"
                  disabled={joining}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:bg-slate-900/80 transition-all"
                />
                <button
                  type="submit"
                  disabled={joining || !inviteCode.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {joining ? "Joining..." : "Join"}
                </button>
              </form>
            </div>

            {joinStatus.message && (
              <div
                className={`mt-4 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  joinStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {joinStatus.message}
              </div>
            )}
          </div>

          {/* Notifications Summary Card */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">🔔 Live Activity Feed</span>
                {unreadNotifs > 0 && (
                  <span className="px-2 py-0.5 text-[10px] bg-violet-600 text-white font-bold rounded-full">
                    {unreadNotifs} Unread
                  </span>
                )}
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Get real-time workspace updates from team members and task assignments.
              </p>

              <div className="space-y-2">
                {(notifications || []).slice(0, 2).map((n) => (
                  <div key={n._id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-850 text-xs text-slate-300">
                    <div className="font-medium leading-relaxed">{n.message || n.text}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {(notifications || []).length === 0 && (
                  <div className="py-4 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-xl">
                    No active notifications
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/60 text-right">
              <Link to="/app/notifications" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                View All Notifications →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Dashboard;