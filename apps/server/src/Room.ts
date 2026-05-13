import { CHARACTERS, FIXED_DT, Game, TICK_RATE } from "@smashing-cats/core";
import {
  normalizeClientMessage,
  toMiniServerMessage,
  type ClientToServerMessage,
  type GameSnapshot,
  type ServerToClientMessage,
} from "@smashing-cats/protocol";
import type { WebSocket } from "ws";

type Client = {
  id: string;
  socket: WebSocket;
};

type RoomOptions = {
  onEmpty: () => void;
};

const FULL_SNAPSHOT_INTERVAL_TICKS = TICK_RATE * 60;

export class Room {
  private readonly game = new Game(1337);
  private readonly clients = new Map<string, Client>();
  private readonly onEmpty: () => void;

  private interval: NodeJS.Timeout | undefined;
  private nextClientNumber = 1;
  private lastSnapshot: GameSnapshot | undefined;
  private ticksSinceFullSnapshot = 0;

  public constructor(options: RoomOptions) {
    this.onEmpty = options.onEmpty;
  }

  public addClient(socket: WebSocket): void {
    const id = `p${this.nextClientNumber++}`;
    this.clients.set(id, { id, socket });

    this.start();

    this.send(socket, {
      type: "welcome",
      playerId: id,
      characters: CHARACTERS,
    });

    this.send(socket, {
      type: "snapshot",
      snapshot: this.game.createSnapshot(),
    });

    socket.on("message", (raw) => {
      this.handleMessage(id, raw.toString());
    });

    socket.on("close", () => {
      this.removeClient(id);
    });

    socket.on("error", () => {
      this.removeClient(id);
    });
  }

  public stop(): void {
    if (this.interval === undefined) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
  }

  public isEmpty(): boolean {
    return this.clients.size === 0;
  }

  private start(): void {
    if (this.interval !== undefined) {
      return;
    }

    this.interval = setInterval(() => {
      if (this.clients.size === 0) {
        this.stop();
        this.onEmpty();
        return;
      }

      this.game.update(FIXED_DT);

      const snapshot = this.game.createSnapshot();

      if (this.shouldSendFullSnapshot()) {
        this.broadcast({
          type: "snapshot",
          snapshot,
        });

        this.lastSnapshot = snapshot;
        this.ticksSinceFullSnapshot = 0;
        return;
      }

      if (this.lastSnapshot !== undefined) {
        this.broadcast({
          type: "delta",
          delta: this.game.createDeltaSnapshot(this.lastSnapshot),
        });
      }

      this.lastSnapshot = snapshot;
      this.ticksSinceFullSnapshot += 1;
    }, 1000 / TICK_RATE);
  }

  private removeClient(playerId: string): void {
    if (!this.clients.has(playerId)) {
      return;
    }

    this.clients.delete(playerId);
    this.game.removePlayer(playerId);

    if (this.clients.size > 0) {
      return;
    }

    this.stop();
    this.onEmpty();
  }

  private shouldSendFullSnapshot(): boolean {
    return this.lastSnapshot === undefined || this.ticksSinceFullSnapshot >= FULL_SNAPSHOT_INTERVAL_TICKS;
  }

  private handleMessage(playerId: string, raw: string): void {
    const message = parseClientMessage(raw);

    if (message === undefined) {
      return;
    }

    switch (message.type) {
      case "join":
        return;

      case "selectCharacter":
        this.game.addPlayer(playerId, message.characterKind);
        return;

      case "input":
        this.game.setInput(playerId, message.input, message.snapshotTick, message.inputSeq);
        return;
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

    socket.send(JSON.stringify(toMiniServerMessage(message)));
  }
}

function parseClientMessage(raw: string): ClientToServerMessage | undefined {
  try {
    return normalizeClientMessage(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
