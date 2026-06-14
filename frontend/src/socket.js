import { io } from "socket.io-client";

let socket = null;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://collabspace-iuji.onrender.com";

export const connect = (opts = {}) => {
  if (socket) return socket;

  const token = localStorage.getItem("token");

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: token || "",
    },
    ...opts,
  });

  socket.on("connect", () => {
    console.log("socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("socket error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
