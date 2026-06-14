import api from "./axios";

/**
 * Fetch aggregated dashboard stats for the authenticated user.
 * GET /api/dashboard/stats
 */
export const getDashboardStats = async () => {
  const res = await api.get("/dashboard/stats");
  return res.data;
};
