import type { Server as HTTPServer } from "http";
import { notifications } from "./notification";

let io: any | null = null;

export function initWebsocket(server: HTTPServer): any | null {
  const enabled =
    (process.env.ENABLE_WEBSOCKETS || "false").toLowerCase() === "true";
  if (!enabled) return null;
  if (io) return io;

  let SocketIOServerCtor: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SocketIOServerCtor = require("socket.io").Server;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "[websocket] ENABLE_WEBSOCKETS=true but socket.io not installed",
    );
    return null;
  }

  io = new SocketIOServerCtor(server, {
    cors: {
      // Use a permissive origin in dev; origin:true echoes request origin
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    },
  });

  io.on("connection", (socket: any) => {
    socket.on("subscribe", (userId?: string) => {
      if (userId) socket.join(`user:${userId}`);
    });
  });

  notifications.on("notification", (payload: any) => {
    if (!io) return;
    const rooms = (payload.targetUserIds || []).map(
      (id: string) => `user:${id}`,
    );
    if (rooms.length) io.to(rooms).emit("notification", payload);
    else io.emit("notification", payload);
  });

  return io;
}

export function getIO(): any | null {
  return io;
}
