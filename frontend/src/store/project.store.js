import { create } from "zustand";
import {
  createProject,
  getProjects,
  deleteProject,
  joinProject,
} from "../api/project.api";

export const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,

  setLoading: (value) => set({ loading: value }),

  // FETCH
  fetchProjects: async () => {
    set({ loading: true });

    try {
      const res = await getProjects();

      set({
        projects: res.projects || [],
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
    }
  },

  // CREATE
  addProject: async (data) => {
    const res = await createProject(data);

    set((state) => ({
      projects: [res.project, ...state.projects],
    }));

    return res;
  },

  // DELETE
  removeProject: async (id) => {
    await deleteProject(id);

    set((state) => ({
      projects: state.projects.filter((p) => p._id !== id),
    }));
  },

  // JOIN
  joinProjectByCode: async (code) => {
    const res = await joinProject(code);

    await get().fetchProjects();

    return res;
  },
}));