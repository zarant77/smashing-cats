import { WebSocketServer } from "ws";
import { Room } from "./Room.js";

process.on("uncaughtException", (error) => {
  console.error("[process] uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection", reason);
});

const port = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port });

const room = new Room({
  onEmpty: () => {
    room.stop();
    console.log("[room] stopped");
  },
});

server.on("connection", (socket, request) => {
  console.log("[ws] connection", {
    url: request.url,
    origin: request.headers.origin,
    userAgent: request.headers["user-agent"],
  });

  socket.on("error", (error) => {
    console.error("[ws] socket error", error);
  });

  socket.on("close", (code, reason) => {
    console.warn("[ws] socket close", {
      code,
      reason: reason.toString(),
    });
  });

  room.addClient(socket);
});

server.on("error", (error) => {
  console.error("[ws] server error", error);
});

console.log(`Smash!ng Cats server listening on ws://localhost:${port}`);
