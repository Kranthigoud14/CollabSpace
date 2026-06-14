import { io } from "socket.io-client";

let socket = null;

export const connect = (url = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", opts = {}) => {
  if (socket) return socket;

  const token = localStorage.getItem("token");

  try {
    socket = io(url, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: token || "",
      },
      ...opts,
    });

    socket.on("connect", () => {
      console.debug("socket connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.debug("socket disconnected", reason);
    });
  } catch (err) {
    console.error("socket connect error", err);
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connect, getSocket, disconnect };