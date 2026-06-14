import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000/api"
    : "https://collabspace-iuji.onrender.com/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

