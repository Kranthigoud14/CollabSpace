import { NavLink, useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notification.store";
import { useAuthStore } from "../../store/auth.store";
import { useEffect } from "react";

function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const handleLogoutClick = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-300 border ${
      isActive
        ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
        : "text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-white hover:border-slate-700/50"
    }`;

  return (
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 p-5 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
          C
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          CollabDoc
        </span>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        <NavLink to="/app/dashboard" className={navLinkClass}>
          <span className="flex items-center gap-3">
            <span className="text-lg">🏠</span> Dashboard
          </span>
        </NavLink>

        <NavLink to="/app/projects" className={navLinkClass}>
          <span className="flex items-center gap-3">
            <span className="text-lg">📁</span> Projects
          </span>
        </NavLink>

        <NavLink to="/app/documents" className={navLinkClass}>
          <span className="flex items-center gap-3">
            <span className="text-lg">📄</span> Documents
          </span>
        </NavLink>

        <NavLink to="/app/tasks" className={navLinkClass}>
          <span className="flex items-center gap-3">
            <span className="text-lg">✅</span> Tasks
          </span>
        </NavLink>

        <NavLink to="/app/notifications" className={navLinkClass}>
          <span className="flex items-center gap-3">
            <span className="text-lg">🔔</span> Notifications
          </span>
          {unreadCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </NavLink>
      </nav>

      <div className="pt-4 border-t border-slate-800/80 mt-auto">
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-300"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;