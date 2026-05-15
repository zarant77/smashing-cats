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

setInterval(() => {
  const memory = process.memoryUsage();

  console.log("[metrics]", {
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapMb: Math.round(memory.heapUsed / 1024 / 1024),
  });
}, 10000);

console.log(`Smash!ng Cats server listening on ws://localhost:${port}`);
