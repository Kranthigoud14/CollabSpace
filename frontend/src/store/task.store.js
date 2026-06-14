import { create } from "zustand";
import {
  getAllTasks,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../api/Task.api";
import { getSocket, connect } from "../services/socket";

// Normalize backend response — backend may return array or { tasks: [] }
const normalizeTasks = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const data = await getAllTasks();
      set({ tasks: normalizeTasks(data), loading: false });
    } catch (err) {
      console.error("fetchTasks error:", err);
      set({ tasks: [], loading: false });
    }
  },

  fetchProjectTasks: async (projectId) => {
    set({ loading: true });
    try {
      const data = await getProjectTasks(projectId);
      set({ tasks: normalizeTasks(data), loading: false });
    } catch (err) {
      console.error("fetchProjectTasks error:", err);
      set({ tasks: [], loading: false });
    }
  },

  addTask: async (data) => {
    try {
      const newTask = await createTask(data);
      if (newTask) {
        set((state) => ({ tasks: [newTask, ...state.tasks] }));
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
    // Ensure socket is connected before subscribing
    const socket = getSocket() || connect();
    if (!socket) return;

    // Join room(s)
    if (projectId === "all") {
      projectIds.forEach((id) => {
        socket.emit("join_project", id);
      });
    } else {
      socket.emit("join_project", projectId);
    }

    // clean up any existing listeners first to avoid duplicate counts
    socket.off("task_created");
    socket.off("task_updated");
    socket.off("task_deleted");

    socket.on("task_created", (payload) => {
      // Filter out tasks not belonging to the active project if a filter is set
      if (projectId !== "all") {
        const payloadProjId = typeof payload.project === "string" ? payload.project : payload.project?._id;
        if (payloadProjId !== projectId) return;
      }

      set((state) => {
        if (state.tasks.some((t) => t._id === payload._id)) return state;
        return { tasks: [payload, ...state.tasks] };
      });
    });

    socket.on("task_updated", (payload) => {
      // Filter out tasks not belonging to the active project if a filter is set
      if (projectId !== "all") {
        const payloadProjId = typeof payload.project === "string" ? payload.project : payload.project?._id;
        if (payloadProjId !== projectId) {
          // If task is no longer in the active project, remove it from the state
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

    // Leave room(s)
    if (projectId === "all") {
      projectIds.forEach((id) => {
        socket.emit("leave_project", id);
      });
    } else {
      socket.emit("leave_project", projectId);
    }

    socket.off("task_created");
    socket.off("task_updated");
    socket.off("task_deleted");
  },
}));
