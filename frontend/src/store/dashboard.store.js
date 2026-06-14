import { create } from "zustand";
import { getDashboardStats as fetchStatsApi } from "../api/dashboard.api";

/**
 * useDashboardStore
 *
 * Provides aggregated dashboard metrics.
 *
 * Shape of stats:
 * {
 *   projects: { total, recent: [{ _id, name, memberCount, isOwner, createdAt }] }
 *   documents: { total, active, personal }
 *   tasks: { total, todo, inProgress, review, completed, overdue }
 *   recentActivities: [Activity]
 * }
 */
export const useDashboardStore = create((set) => ({
  stats: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchStatsApi();
      set({
        stats: res?.stats || null,
        loading: false,
      });
    } catch (err) {
      console.error("fetchStats error", err);
      set({
        error: err?.response?.data?.message || "Failed to load dashboard stats",
        loading: false,
      });
    }
  },

  clearStats: () => set({ stats: null, error: null }),
}));
