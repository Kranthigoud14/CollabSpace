import api from "./axios";

// GET ALL TASKS
export const getAllTasks = async () => {
  const res = await api.get("/tasks");
  return res.data;
};

// GET PROJECT TASKS
export const getProjectTasks = async (projectId) => {
  const res = await api.get(`/tasks/project/${projectId}`);
  return res.data;
};

// CREATE TASK
export const createTask = async (data) => {
  const res = await api.post("/tasks", data);
  return res.data;
};

// UPDATE TASK
export const updateTask = async (taskId, data) => {
  const res = await api.put(`/tasks/${taskId}`, data);
  return res.data;
};

// DELETE TASK
export const deleteTask = async (taskId) => {
  const res = await api.delete(`/tasks/${taskId}`);
  return res.data;
};
