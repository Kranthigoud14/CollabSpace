import { useEffect, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { useNotificationStore } from "../../store/notification.store";

function Notifications() {
  const { notifications, fetchNotifications, markRead, markAllRead, deleteOne, deleteAll } = useNotificationStore();
  const [filter, setFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteOne(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter list
  const filteredNotifs = (notifications || []).filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Notifications Log</h1>
            <p className="text-slate-400 mt-1.5 text-sm font-medium">
              Keep track of collaborations, documents, tasks, and project invitations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-650/10"
              >
                Mark all as read
              </button>
            )}
            {(notifications || []).length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-xs font-bold rounded-xl border border-red-500/20 transition-all"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex border-b border-slate-800">
          {["all", "unread", "read"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all capitalize -mb-[2px] ${
                filter === tab
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab} {tab === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
          ))}
        </div>

        {/* Log list */}
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No notifications to display.
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n._id}
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-start justify-between gap-4 ${
                  n.isRead
                    ? "bg-slate-900/20 border-slate-900 text-slate-400"
                    : "bg-indigo-600/[0.03] border-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.01)]"
                }`}
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.type && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-750">
                        {n.type}
                      </span>
                    )}
                    <span className="text-slate-500 text-[10px]">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-relaxed">
                    {n.message || n.text || "Workspace update received."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg transition-all"
                    >
                      Mark Read
                    </button>
                  )}
                  
                  <button
                    disabled={deletingId === n._id}
                    onClick={() => handleDelete(n._id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs"
                    title="Delete notification"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default Notifications;
