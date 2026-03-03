import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/app/hooks";

let socket: Socket | null = null;

export const useAppSocket = () => {
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    if (!socket) {
      socket = io(import.meta.env.VITE_WS_URL || "http://localhost:3000", {
        auth: {
          token: accessToken,
        },
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("Connected to app socket", { socketId: socket?.id, user: user?.id });
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from app socket");
      });
    }

    socketRef.current = socket;

    return () => {
      // We don't disconnect on unmount to keep the singleton connection
    };
  }, [accessToken, user]);

  return socketRef.current;
};
