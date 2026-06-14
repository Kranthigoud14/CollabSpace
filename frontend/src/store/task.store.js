import { create } from "zustand";
import {
  getAllTasks,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../api/Task.api";
import { getSocket, connect } from "../services/socket";

const normalizeTasks = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

let fetchSeq = 0;

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  activeProjectFilter: "all",

  fetchTasks: async () => {
    const seq = ++fetchSeq;
    set({ loading: true, activeProjectFilter: "all" });
    try {
      const data = await getAllTasks();
      if (seq !== fetchSeq) return;
      set({ tasks: normalizeTasks(data), loading: false });
    } catch (err) {
      console.error("fetchTasks error:", err);
      if (seq !== fetchSeq) return;
      set({ tasks: [], loading: false });
      throw err;
    }
  },

  fetchProjectTasks: async (projectId) => {
    const seq = ++fetchSeq;
    set({ loading: true, activeProjectFilter: projectId });
    try {
      const data = await getProjectTasks(projectId);
      if (seq !== fetchSeq) return;
      set({ tasks: normalizeTasks(data), loading: false });
    } catch (err) {
      console.error("fetchProjectTasks error:", err);
      if (seq !== fetchSeq) return;
      set({ tasks: [], loading: false });
      throw err;
    }
  },

  addTask: async (data) => {
    try {
      const newTask = await createTask(data);
      if (newTask) {
        set((state) => {
          if (state.tasks.some((t) => t._id === newTask._id)) return state;
          return { tasks: [newTask, ...state.tasks] };
        });
      }
      return newTask;
    } catch (err) {
      console.error("addTask error:", err);
      throw err;
    }
  },

  editTask: async (taskId, data) => {
    try {
      const updated = await updateTask(taskId, data);
      if (updated) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === taskId ? updated : t)),
        }));
      }
      return updated;
    } catch (err) {
      console.error("editTask error:", err);
      throw err;
    }
  },

  removeTask: async (taskId) => {
    try {
      await deleteTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
      }));
    } catch (err) {
      console.error("removeTask error:", err);
      throw err;
    }
  },

  subscribeSocket: (projectId = "all", projectIds = []) => {
    const socket = getSocket() || connect();
    if (!socket) return;

    const normalizeId = (id) => (id ? id.toString() : id);

    if (projectId === "all") {
      projectIds.forEach((id) => {
        socket.emit("join_project", normalizeId(id));
      });
    } else {
      socket.emit("join_project", normalizeId(projectId));
    }

    socket.off("task_created");
    socket.off("task_updated");
    socket.off("task_deleted");

    socket.on("task_created", (payload) => {
      if (projectId !== "all") {
        const payloadProjId =
          typeof payload.project === "string"
            ? payload.project
            : payload.project?._id?.toString();
        if (payloadProjId !== projectId.toString()) return;
      }

      set((state) => {
        if (state.tasks.some((t) => t._id === payload._id)) return state;
        return { tasks: [payload, ...state.tasks] };
      });
    });

    socket.on("task_updated", (payload) => {
      if (projectId !== "all") {
        const payloadProjId =
          typeof payload.project === "string"
            ? payload.project
            : payload.project?._id?.toString();
        if (payloadProjId !== projectId.toString()) {
          set((state) => ({
            tasks: state.tasks.filter((t) => t._id !== payload._id),
          }));
          return;
        }
      }

      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === payload._id ? payload : t)),
      }));
    });

    socket.on("task_deleted", (taskId) => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
      }));
    });
  },

  unsubscribeSocket: (projectId = "all", projectIds = []) => {
    const socket = getSocket();
    if (!socket) return;

    const normalizeId = (id) => (id ? id.toString() : id);

    if (projectId === "all") {
      projectIds.forEach((id) => {
        socket.emit("leave_project", normalizeId(id));
      });
    } else {
      socket.emit("leave_project", normalizeId(projectId));
    }

    socket.off("task_created");
    socket.off("task_updated");
    socket.off("task_deleted");
  },
}));
