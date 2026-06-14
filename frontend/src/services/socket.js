import { io } from "socket.io-client";

let socket = null;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://collabspace-iuji.onrender.com";

export const connect = (opts = {}) => {
  const token = localStorage.getItem("token");

  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: token || "",
    },
    ...opts,
  });

  socket.on("connect", () => {
    console.debug("socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.debug("socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("socket connect error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnect = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export default { connect, getSocket, disconnect };
