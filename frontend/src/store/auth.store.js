import { create } from "zustand";
import api from "../api/axios";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,

  login: async (data) => {
    set({ loading: true });

    try {
      const res = await api.post("/auth/login", data);

      const { user, token } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        user,
        token,
        loading: false,
      });

      return res.data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true });

    try {
      const res = await api.post("/auth/register", data);

      set({ loading: false });

      return res.data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.log("Backend logout request failed, clearing local storage anyway", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      set({
        user: null,
        token: null,
      });
    }
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const res = await api.get("/auth/profile");
      const user = res.data.user || res.data;

      localStorage.setItem("user", JSON.stringify(user));
      set({ user });
    } catch (err) {
      console.log("Profile fetch failed");
    }
  },
}));