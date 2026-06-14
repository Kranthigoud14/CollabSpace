import { useEffect, useState, useRef } from "react";
import { useNotificationStore } from "../store/notification.store";
import { connect } from "../services/socket";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, fetchNotifications, subscribeSocket, markRead, markAllRead, deleteAll } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    connect();
    subscribeSocket();

    // Close on click outside
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const unreadList = (notifications || []).filter((n) => !n.isRead);
  const unreadCount = unreadList.length;

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    try {
      await markAllRead();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleClearAll = async (e) => {
    e?.stopPropagation();
    try {
      await deleteAll();
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markRead(n._id);
    }
  };

  const toggleOpen = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState && unreadCount > 0) {
      handleMarkAllRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-all duration-300 relative"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Notifications
            </span>
            {unreadCount > 0 && (
              <>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors ml-2"
                >
                  Clear All
                </button>
              </>
            )}
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {(notifications || []).length === 0 ? (
              <div className="px-3 py-6 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              (notifications || []).map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                    n.isRead
                      ? "bg-slate-900/40 border-transparent text-slate-400 hover:bg-slate-800/30"
                      : "bg-indigo-600/5 border-indigo-500/10 text-white hover:bg-indigo-600/10"
                  }`}
                >
                  <div className="text-sm font-medium leading-relaxed">
                    {n.message || n.text || "Notification received"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
                    <span>
                      {n.type ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase text-[9px] font-semibold tracking-wider mr-1">
                          {n.type}
                        </span>
                      ) : null}
                    </span>
                    <span>
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
