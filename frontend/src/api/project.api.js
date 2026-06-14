import api from "./axios";

// CREATE PROJECT
export const createProject = async (data) => {
  const res = await api.post("/projects", data);
  return res.data;
};

// GET MY PROJECTS
export const getProjects = async () => {
  const res = await api.get("/projects");
  return res.data;
};

// GET SINGLE PROJECT
export const getProjectById = async (id) => {
  const res = await api.get(`/projects/${id}`);
  return res.data;
};

// UPDATE PROJECT
export const updateProject = async (id, data) => {
  const res = await api.put(`/projects/${id}`, data);
  return res.data;
};

// DELETE PROJECT
export const deleteProject = async (id) => {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
};

// JOIN PROJECT (invite code)
export const joinProject = async (inviteCode) => {
  const res = await api.post("/projects/join", {
    inviteCode,
  });
  return res.data;
};