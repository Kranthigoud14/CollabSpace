import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import { useAuthStore } from "../../store/auth.store";

function Topbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const user = JSON.parse(localStorage.getItem("user")) || {
    name: "Developer",
  };

  const firstLetter = user.name?.charAt(0).toUpperCase() || "D";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const pathnames = location.pathname.split("/").filter((x) => x && x !== "app");

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xl px-6 flex items-center justify-between">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/app/dashboard" className="hover:text-indigo-400 transition-colors">
          App
        </Link>
        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/app/${pathnames.slice(0, index + 1).join("/")}`;
          const label = value.replace(/-/g, " ");

          return (
            <div key={to} className="flex items-center gap-2">
              <span className="text-slate-600">/</span>
              {isLast ? (
                <span className="text-slate-200 font-medium capitalize truncate max-w-[200px]">
                  {label}
                </span>
              ) : (
                <Link to={to} className="hover:text-indigo-400 transition-colors capitalize">
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 relative">
        <NotificationBell />

        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold hover:opacity-90 transition-all duration-300 shadow-md shadow-indigo-500/10"
        >
          {firstLetter}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate mt-0.5">{user.email || "Workspace Member"}</p>
            </div>

            <div className="p-1.5">
              <Link
                to="/app/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 text-sm rounded-lg hover:bg-slate-800 transition-colors"
              >
                📊 Dashboard
              </Link>
              
              <Link
                to="/app/projects"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 text-sm rounded-lg hover:bg-slate-800 transition-colors"
              >
                📁 Projects
              </Link>

              <button
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-400 text-sm rounded-lg hover:bg-red-500/10 transition-colors text-left"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;