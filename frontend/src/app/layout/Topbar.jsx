import { useState, useRef, useEffect } from "react";
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

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xl px-6 flex items-center justify-between relative z-30 shrink-0">
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

      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <NotificationBell />

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold hover:opacity-90 transition-all duration-300 shadow-md shadow-indigo-500/10 cursor-pointer"
          aria-label="User profile menu"
          aria-expanded={open}
        >
          {firstLetter}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Details */}
            <div className="px-4 py-3.5 border-b border-slate-800/90 bg-slate-950/60">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Profile
              </span>
              <p className="text-white font-bold text-sm truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate mt-0.5">{user.email || "Workspace Member"}</p>
            </div>

            {/* Quick Links */}
            <div className="p-2 space-y-1">
              <Link
                to="/app/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white text-xs font-medium rounded-xl hover:bg-slate-800/80 transition-colors"
              >
                <span>📊</span> Workspace Dashboard
              </Link>
              
              <Link
                to="/app/projects"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white text-xs font-medium rounded-xl hover:bg-slate-800/80 transition-colors"
              >
                <span>📁</span> Project Workspaces
              </Link>

              <Link
                to="/app/documents"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white text-xs font-medium rounded-xl hover:bg-slate-800/80 transition-colors"
              >
                <span>📄</span> All Documents
              </Link>

              <div className="pt-2 mt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-red-400 hover:text-white text-xs font-bold rounded-xl bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 transition-all cursor-pointer"
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;