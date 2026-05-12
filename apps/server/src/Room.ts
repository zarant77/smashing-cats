import { CHARACTERS, FIXED_DT, Game, TICK_RATE } from "@smashing-cats/core";
import type { ClientToServerMessage, ServerToClientMessage } from "@smashing-cats/protocol";
import type { WebSocket } from "ws";

type Client = {
  id: string;
  socket: WebSocket;
};

export class Room {
  private readonly game = new Game(1337);
  private readonly clients = new Map<string, Client>();
  private interval: NodeJS.Timeout | undefined;
  private nextClientNumber = 1;

  public addClient(socket: WebSocket): void {
    const id = `p${this.nextClientNumber++}`;
    this.clients.set(id, { id, socket });

    this.send(socket, {
      type: "welcome",
      playerId: id,
      characters: CHARACTERS,
    });

    socket.on("message", (raw) => {
      this.handleMessage(id, raw.toString());
    });

    socket.on("close", () => {
      this.clients.delete(id);
      this.game.removePlayer(id);
    });
  }

  public start(): void {
    if (this.interval !== undefined) {
      return;
    }

    this.interval = setInterval(() => {
      this.game.update(FIXED_DT);
      this.broadcast({
        type: "snapshot",
        snapshot: this.game.createSnapshot(),
      });
    }, 1000 / TICK_RATE);
  }

  private handleMessage(playerId: string, raw: string): void {
    const message = parseClientMessage(raw);
    if (message === undefined) {
      return;
    }

    if (message.type === "input") {
      this.game.setInput(playerId, message.input, message.snapshotTick, message.inputSeq ?? message.tick);
    }

    if (message.type === "playerState") {
      this.game.setPlayerState(playerId, message);
    }

    if (message.type === "entityCollision") {
      this.game.handleEntityCollision(playerId, message);
    }

    if (message.type === "selectCharacter") {
      this.game.addPlayer(playerId, message.characterKind);
    }
  }

  private broadcast(message: ServerToClientMessage): void {
    for (const client of this.clients.values()) {
      this.send(client.socket, message);
    }
  }

  private send(socket: WebSocket, message: ServerToClientMessage): void {
    if (socket.readyState !== socket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }
}

function parseClientMessage(raw: string): ClientToServerMessage | undefined {
  try {
    return JSON.parse(raw) as ClientToServerMessage;
  } catch {
    return undefined;
  }
}
