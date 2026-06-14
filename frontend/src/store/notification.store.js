import { create } from "zustand";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllNotifications,
  deleteNotification as deleteNotificationApi,
} from "../api/notification.api";
import { getSocket } from "../services/socket";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await getNotifications();
      // API returns { success: true, notifications }
      const notifs = res?.notifications || res?.data || [];
      set({ notifications: Array.isArray(notifs) ? notifs : [], loading: false });
    } catch (err) {
      console.error("fetchNotifications error", err);
      set({ notifications: [], loading: false });
    }
  },

  markRead: async (id) => {
    try {
      await markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
      }));
    } catch (err) {
      console.error("markRead error", err);
    }
  },

  markAllRead: async () => {
    try {
      await markAllNotificationsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (err) {
      console.error("markAllRead error", err);
    }
  },

  // Delete a single notification by ID
  deleteOne: async (id) => {
    try {
      await deleteNotificationApi(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n._id !== id),
      }));
    } catch (err) {
      console.error("deleteOne notification error", err);
    }
  },

  // Delete ALL notifications for the current user
  deleteAll: async () => {
    try {
      await deleteAllNotifications();
      set({ notifications: [] });
    } catch (err) {
      console.error("deleteAll notifications error", err);
    }
  },

  // Subscribe to real-time socket notifications
  subscribeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("notification");

    socket.on("notification", (payload) => {
      console.log("RECEIVED SOCKET NOTIFICATION:", payload);
      set((state) => {
        if (state.notifications.some((n) => n._id === payload._id)) return state;
        return { notifications: [payload, ...state.notifications] };
      });
    });
  },

  unsubscribeSocket: () => {
    const socket = getSocket();
    if (socket) socket.off("notification");
  },

  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
}));
