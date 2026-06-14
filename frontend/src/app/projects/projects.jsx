import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import { useProjectStore } from "../../store/project.store";
import { useAuthStore } from "../../store/auth.store";

function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const safeUser = user || JSON.parse(localStorage.getItem("user")) || {};

  const {
    projects,
    fetchProjects,
    addProject,
    removeProject,
    joinProjectByCode,
    loading,
  } = useProjectStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ success: null, message: "" });

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      await addProject({
        name,
        description: description.trim() || "Collaborative project workspace",
      });
      setName("");
      setDescription("");
      setStatus({ success: true, message: "Workspace created successfully!" });
      fetchProjects();
    } catch (err) {
      console.error(err);
      setStatus({ success: false, message: "Failed to create project workspace." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setSubmitting(true);
      await joinProjectByCode(inviteCode.trim());
      setInviteCode("");
      setStatus({ success: true, message: "Workspace joined successfully!" });
      fetchProjects();
    } catch (err) {
      console.error(err);
      setStatus({
        success: false,
        message: err?.response?.data?.message || "Invalid invite code or already a member.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Workspaces & Projects</h1>
          <p className="text-slate-400 mt-1.5 text-sm font-medium">
            Create a collaborative workspace or join an existing one to work with your team.
          </p>
        </div>

        {/* STATUS BAR */}
        {status.message && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all ${
              status.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span>{status.message}</span>
            <button onClick={() => setStatus({ success: null, message: "" })} className="text-xs opacity-60 hover:opacity-100 font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* CREATE + JOIN CARDS */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create project card */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-3">🛠️ Create Workspace</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name (e.g. Acme Marketing)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:bg-slate-900/60 transition-all"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workspace description"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:bg-slate-900/60 h-20 transition-all"
              />
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all"
              >
                {submitting ? "Processing..." : "Create Workspace"}
              </button>
            </form>
          </div>

          {/* Join project card */}
          <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-3">⚡ Join Existing Workspace</h3>
              <p className="text-slate-400 text-xs mb-4">
                Ask a project Owner or Editor for their invite code. Enter it below to join.
              </p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite code (e.g. 660f4e3c)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:bg-slate-900/60 transition-all"
                />
                <button
                  type="submit"
                  disabled={submitting || !inviteCode.trim()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-sm transition-all border border-slate-700"
                >
                  {submitting ? "Joining..." : "Join Workspace"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* PROJECTS LIST */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Your Active Workspaces</h3>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No workspaces joined yet. Create one above to get started!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => {
                const isOwner = p.owner?._id === safeUser._id || p.owner === safeUser._id;
                
                // Find user's member role
                const myMemberRecord = p.members?.find(
                  (m) => m?.user?._id === safeUser._id || m?.user === safeUser._id
                );
                const role = myMemberRecord?.role || (isOwner ? "owner" : "viewer");

                return (
                  <div
                    key={p._id}
                    className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/[0.02] flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          Invite Code: {p.inviteCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          role === "owner"
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                            : role === "editor" || role === "member"
                            ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}>
                          {role}
                        </span>
                      </div>

                      <h4 className="text-white font-bold text-base mt-3 group-hover:text-indigo-400 transition-colors">
                        {p.name}
                      </h4>

                      <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {p.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-850">
                      <button
                        onClick={() => navigate(`/app/projects/${p._id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        Enter Workspace →
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => removeProject(p._id)}
                          className="text-red-500 hover:text-red-400 text-xs font-medium px-2 py-1 rounded hover:bg-red-500/10 transition-all"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default Projects;