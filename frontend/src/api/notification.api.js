import api from "./axios";

export const getNotifications = async () => {
  const res = await api.get("/notifications");
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.put("/notifications/read-all");
  return res.data;
};

export const deleteAllNotifications = async () => {
  const res = await api.delete(`/notifications`);
  return res.data;
};

export const deleteNotification = async (id) => {
  const res = await api.delete(`/notifications/${id}`);
  return res.data;
};
