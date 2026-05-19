import { CHARACTERS, FIXED_DT, Game, SNAPSHOT_INTERVAL_TICKS, TICK_RATE } from "@smashing-cats/core";
import {
  normalizeMessage,
  minifyMessage,
  type ClientToServerMessage,
  type DeltaSnapshot,
  type GameSnapshot,
  type ServerToClientMessage,
  EntityKind,
} from "@smashing-cats/protocol";
import type { WebSocket } from "ws";

type Client = {
  socket: WebSocket;
  alive: boolean;
};

type Match = {
  code: string;
  game: Game;
  playerIds: Set<string>;
  lastFullSnapshot: GameSnapshot | undefined;
  ticksSinceFullSnapshot: number;
  cleanupTimeout: NodeJS.Timeout | undefined;
};

type RoomOptions = {
  onEmpty: () => void;
};

const FULL_SNAPSHOT_INTERVAL_TICKS = TICK_RATE * 60;
const EMPTY_MATCH_CLEANUP_MS = 10_000;

export class Room {
  private readonly clients = new Map<string, Client>();
  private readonly matches = new Map<string, Match>();
  private readonly playerMatchCodes = new Map<string, string>();
  private readonly onEmpty: () => void;

  private interval: NodeJS.Timeout | undefined;
  private lastPingTime = 0;
  private nextClientNumber = 1;

  public constructor(options: RoomOptions) {
    this.onEmpty = options.onEmpty;
  }

  public addClient(socket: WebSocket): void {
    const id = `p${this.nextClientNumber++}`;

    this.clients.set(id, {
      socket,
      alive: true,
    });

    this.start();

    this.send(socket, {
      type: "welcome",
      playerId: id,
      characters: CHARACTERS,
    });

    socket.on("pong", () => {
      const client = this.clients.get(id);

      if (client !== undefined) {
        client.alive = true;
      }
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

      const now = Date.now();

      if (now - this.lastPingTime >= 10_000) {
        this.lastPingTime = now;

        for (const [playerId, client] of this.clients) {
          if (!client.alive) {
            console.log(`[room] ping timeout ${playerId}`);

            client.socket.terminate();
            this.removeClient(playerId);

            continue;
          }

          client.alive = false;
          client.socket.ping();
        }
      }

      for (const match of this.matches.values()) {
        this.updateMatch(match);
      }
    }, 1000 / TICK_RATE);
  }

  private updateMatch(match: Match): void {
    if (match.playerIds.size === 0) {
      return;
    }

    match.game.update(FIXED_DT);
    match.ticksSinceFullSnapshot += 1;

    const snapshot = match.game.createSnapshot();

    if (snapshot.tick % SNAPSHOT_INTERVAL_TICKS !== 0) {
      return;
    }

    if (this.shouldSendFullSnapshot(match)) {
      this.broadcastToMatch(match, {
        type: "snapshot",
        snapshot,
      });

      match.lastFullSnapshot = snapshot;
      match.ticksSinceFullSnapshot = 0;

      return;
    }

    if (match.lastFullSnapshot !== undefined) {
      const delta = match.game.createDeltaSnapshot(match.lastFullSnapshot);

      if (!hasDeltaChanges(delta)) {
        return;
      }

      this.broadcastToMatch(match, {
        type: "delta",
        delta,
      });
    }
  }

  private removeClient(playerId: string): void {
    if (!this.clients.has(playerId)) {
      return;
    }

    console.log(`[room] removing client ${playerId}`);

    this.clients.delete(playerId);
    this.removePlayerFromMatch(playerId);

    if (this.clients.size > 0) {
      return;
    }

    this.stop();
    this.onEmpty();
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
        this.selectCharacter(playerId, message.matchCode, message.characterKind);
        return;

      case "input":
        this.handleInput(playerId, message);
        return;

      case "pause":
        this.handlePause(playerId, message.paused);
        return;
    }
  }

  private selectCharacter(playerId: string, matchCode: string, characterKind: EntityKind): void {
    const client = this.clients.get(playerId);

    if (client === undefined) {
      return;
    }

    this.removePlayerFromMatch(playerId);

    const normalizedMatchCode = normalizeMatchCode(matchCode);
    const match = this.getOrCreateMatch(normalizedMatchCode);

    match.playerIds.add(playerId);
    this.playerMatchCodes.set(playerId, match.code);

    match.game.addPlayer(playerId, characterKind);

    const snapshot = match.game.createSnapshot();

    match.lastFullSnapshot = snapshot;
    match.ticksSinceFullSnapshot = 0;

    this.broadcastToMatch(match, {
      type: "snapshot",
      snapshot,
    });

    console.log(`[match:${match.code}] player ${playerId} selected character ${characterKind}`);
  }

  private handleInput(playerId: string, message: Extract<ClientToServerMessage, { type: "input" }>): void {
    const match = this.getPlayerMatch(playerId);

    if (match === undefined) {
      return;
    }

    match.game.setInput(playerId, message.input, message.snapshotTick, message.inputSeq);
  }

  private handlePause(playerId: string, paused: boolean): void {
    const match = this.getPlayerMatch(playerId);

    if (match === undefined) {
      return;
    }

    match.game.setPaused(playerId, paused);
  }

  private getOrCreateMatch(code: string): Match {
    const existingMatch = this.matches.get(code);

    if (existingMatch !== undefined) {
      this.cancelMatchCleanup(existingMatch);
      return existingMatch;
    }

    const match: Match = {
      code,
      game: new Game(1337),
      playerIds: new Set<string>(),
      lastFullSnapshot: undefined,
      ticksSinceFullSnapshot: 0,
      cleanupTimeout: undefined,
    };

    this.matches.set(code, match);

    console.log(`[match:${code}] created`);

    return match;
  }

  private getPlayerMatch(playerId: string): Match | undefined {
    const matchCode = this.playerMatchCodes.get(playerId);

    if (matchCode === undefined) {
      return undefined;
    }

    return this.matches.get(matchCode);
  }

  private removePlayerFromMatch(playerId: string): void {
    const match = this.getPlayerMatch(playerId);

    if (match === undefined) {
      return;
    }

    match.playerIds.delete(playerId);
    match.game.removePlayer(playerId);
    this.playerMatchCodes.delete(playerId);

    if (match.playerIds.size === 0) {
      this.scheduleMatchCleanup(match);
    }
  }

  private scheduleMatchCleanup(match: Match): void {
    this.cancelMatchCleanup(match);

    match.cleanupTimeout = setTimeout(() => {
      if (match.playerIds.size > 0) {
        return;
      }

      this.matches.delete(match.code);

      console.log(`[match:${match.code}] removed`);
    }, EMPTY_MATCH_CLEANUP_MS);
  }

  private cancelMatchCleanup(match: Match): void {
    if (match.cleanupTimeout === undefined) {
      return;
    }

    clearTimeout(match.cleanupTimeout);
    match.cleanupTimeout = undefined;
  }

  private shouldSendFullSnapshot(match: Match): boolean {
    return match.lastFullSnapshot === undefined || match.ticksSinceFullSnapshot >= FULL_SNAPSHOT_INTERVAL_TICKS;
  }

  private broadcastToMatch(match: Match, message: ServerToClientMessage): void {
    for (const playerId of match.playerIds) {
      const client = this.clients.get(playerId);

      if (client === undefined) {
        continue;
      }

      this.send(client.socket, message);
    }
  }

  private send(socket: WebSocket, message: ServerToClientMessage): void {
    if (socket.readyState !== socket.OPEN) {
      return;
    }

    socket.send(minifyMessage(message));
  }
}

function normalizeMatchCode(matchCode: string): string {
  const value = matchCode.trim().toUpperCase();

  if (value === "") {
    return "DEFAULT";
  }

  return value;
}

function parseClientMessage(raw: string): ClientToServerMessage | undefined {
  try {
    return normalizeMessage(JSON.parse(raw)) as ClientToServerMessage;
  } catch {
    return undefined;
  }
}

function hasDeltaChanges(delta: DeltaSnapshot): boolean {
  return Object.keys(delta).some((key) => key !== "tick");
}
