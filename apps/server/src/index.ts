import { WebSocketServer } from "ws";
import { Room } from "./Room.js";

const port = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port });
const room = new Room();

room.start();

server.on("connection", (socket) => {
  room.addClient(socket);
});

console.log(`Smashing Cats server listening on ws://localhost:${port}`);
