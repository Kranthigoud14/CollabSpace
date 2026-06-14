import { io } from "socket.io-client";

let socket = null;
const reconnectCallbacks = new Set();

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.MODE === "development") {
    return "http://localhost:5000";
  }
  return "https://collabspace-iuji.onrender.com";
};

const notifyReconnect = () => {
  reconnectCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("socket reconnect callback error:", err);
    }
  });
};

const attachGlobalListeners = (sock) => {
  sock.on("connect", () => {
    console.debug("socket connected:", sock.id);
  });

  sock.on("disconnect", (reason) => {
    console.debug("socket disconnected:", reason);
  });

  sock.on("connect_error", (err) => {
    console.error("socket connect error:", err.message);
  });

  sock.io.on("reconnect", () => {
    console.debug("socket reconnected:", sock.id);
    notifyReconnect();
  });
};

export const connect = (opts = {}) => {
  const token = localStorage.getItem("token");

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token: token || "" };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(getSocketUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: token || "",
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    ...opts,
  });

  attachGlobalListeners(socket);
  return socket;
};

export const getSocket = () => socket;

export const onReconnect = (callback) => {
  reconnectCallbacks.add(callback);
  return () => reconnectCallbacks.delete(callback);
};

export const disconnect = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export default { connect, getSocket, disconnect, onReconnect };
