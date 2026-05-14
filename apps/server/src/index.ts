import { WebSocketServer } from "ws";
import { Room } from "./Room.js";

const port = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port });

const room = new Room({
  onEmpty: () => {
    room.stop();

    console.log("[room] stopped");
  },
});

server.on("connection", (socket) => {
  room.addClient(socket);
});

console.log(`Smash!ng Cats server listening on ws://localhost:${port}`);
