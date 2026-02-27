import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? `http://localhost:${3000}` : "");

/**
 * Hook that manages a Socket.io connection to the /dashboard namespace.
 * Returns { socket, connected, on, off }.
 */
export function useWebSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(`${API_BASE}/dashboard`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, connected, on, off };
}

export default useWebSocket;
