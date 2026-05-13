import { WebSocketServer } from "ws";
import { Room } from "./Room.js";

const port = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port });

const rooms = new Map<string, Room>();

server.on("connection", (socket, request) => {
  const matchCode = getMatchCode(request.url);
  const room = getOrCreateRoom(matchCode);

  room.addClient(socket);
});

console.log(`Smash!ng Cats server listening on ws://localhost:${port}`);

function getOrCreateRoom(matchCode: string): Room {
  const existingRoom = rooms.get(matchCode);

  if (existingRoom !== undefined) {
    return existingRoom;
  }

  const room = new Room({
    onEmpty: () => {
      room.stop();
      rooms.delete(matchCode);

      console.log(`[room:${matchCode}] removed`);
    },
  });

  rooms.set(matchCode, room);

  console.log(`[room:${matchCode}] created`);

  return room;
}

function getMatchCode(url: string | undefined): string {
  if (url === undefined) {
    return "default";
  }

  const parsedUrl = new URL(url, "http://localhost");
  const matchCode = parsedUrl.searchParams.get("match");

  if (matchCode === null || matchCode.trim() === "") {
    return "default";
  }

  return matchCode.trim().toUpperCase();
}
