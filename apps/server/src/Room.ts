import {
  CHARACTERS,
  FIXED_DT,
  Game,
  SNAPSHOT_INTERVAL_TICKS,
  TICK_RATE,
  createDeltaSnapshot,
  type ReplayVerificationResult,
  verifyGameReplay,
} from "@smashing-cats/core";
import {
  normalizeMessage,
  minifyMessage,
  type ClientToServerMessage,
  type DeltaSnapshot,
  type GameEvent,
  type ReplayInputFrame,
  type ReplayInputRun,
  type GameSnapshot,
  type LeaderboardMode,
  type ServerToClientMessage,
} from "@smashing-cats/protocol";
import type { WebSocket } from "ws";
import { leaderboardStore } from "./leaderboard.js";

type Client = {
  socket: WebSocket;
  alive: boolean;
};

type Match = {
  code: string;
  game: Game;
  playerIds: Set<string>;
  leaderboardProcessedPlayerIds: Set<string>;
  lastFullSnapshot: GameSnapshot | undefined;
  lastNetworkSnapshot: GameSnapshot | undefined;
  pendingEvents: GameEvent[];
  ticksSinceFullSnapshot: number;
  cleanupTimeout: NodeJS.Timeout | undefined;
};

type PendingLeaderboardSubmission = {
  mode: LeaderboardMode;
  characterKind: string;
  durationSeconds: number;
  score: number;
};

type ReplayVerificationReplay = Extract<ClientToServerMessage, { type: "submitReplayForVerification" }>["replay"];

type RoomOptions = {
  onEmpty: () => void;
};

const FULL_SNAPSHOT_INTERVAL_TICKS = TICK_RATE * 60;
const EMPTY_MATCH_CLEANUP_MS = 10_000;
const REPLAY_VERIFICATION_COOLDOWN_MS = 5_000;

export class Room {
  private readonly clients = new Map<string, Client>();
  private readonly matches = new Map<string, Match>();
  private readonly playerMatchCodes = new Map<string, string>();
  private readonly pendingLeaderboardSubmissions = new Map<string, PendingLeaderboardSubmission>();
  private readonly lastReplayVerificationSubmitAt = new Map<string, number>();
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

    if (match.game.isGamePaused()) {
      return;
    }

    match.game.update(FIXED_DT);
    match.ticksSinceFullSnapshot += 1;

    const snapshot = match.game.createSnapshot();
    this.processLeaderboardEligibility(match, snapshot);
    match.pendingEvents.push(...snapshot.events);

    if (snapshot.tick % SNAPSHOT_INTERVAL_TICKS !== 0) {
      return;
    }

    const networkSnapshot = withEvents(snapshot, match.pendingEvents);

    if (this.shouldSendFullSnapshot(match)) {
      this.broadcastToMatch(match, {
        type: "snapshot",
        snapshot: networkSnapshot,
      });

      match.lastFullSnapshot = networkSnapshot;
      match.lastNetworkSnapshot = networkSnapshot;
      match.pendingEvents = [];
      match.ticksSinceFullSnapshot = 0;

      return;
    }

    if (match.lastNetworkSnapshot !== undefined) {
      const delta = createDeltaSnapshot(match.lastNetworkSnapshot, networkSnapshot);

      if (!hasDeltaChanges(delta)) {
        return;
      }

      this.broadcastToMatch(match, {
        type: "delta",
        delta,
      });

      match.lastNetworkSnapshot = networkSnapshot;
      match.pendingEvents = [];
    }
  }

  private removeClient(playerId: string): void {
    if (!this.clients.has(playerId)) {
      return;
    }

    console.log(`[room] removing client ${playerId}`);

    this.clients.delete(playerId);
    this.lastReplayVerificationSubmitAt.delete(playerId);
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

      case "getLeaderboard":
        this.sendLeaderboard(playerId, message.mode);
        return;

      case "submitLeaderboardEntry":
        this.submitLeaderboardEntry(playerId, message.playerName);
        return;

      case "submitReplayForVerification":
        this.submitReplayForVerification(playerId, message.replay);
        return;
    }
  }

  private selectCharacter(playerId: string, matchCode: string, characterKind: string): void {
    const client = this.clients.get(playerId);

    if (client === undefined) {
      return;
    }

    this.removePlayerFromMatch(playerId);

    const normalizedMatchCode = normalizeMatchCode(matchCode);
    const match = this.getOrCreateMatch(normalizedMatchCode);

    match.playerIds.add(playerId);
    match.leaderboardProcessedPlayerIds.delete(playerId);
    this.playerMatchCodes.set(playerId, match.code);
    this.pendingLeaderboardSubmissions.delete(playerId);

    match.game.addPlayer(playerId, characterKind);

    if (match.playerIds.size > 1) {
      match.game.setGamePaused(false);
    }

    const snapshot = match.game.createSnapshot();

    match.lastFullSnapshot = snapshot;
    match.lastNetworkSnapshot = snapshot;
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

    if (this.isSingleplayerMatch(match)) {
      match.game.setGamePaused(paused);
      this.broadcastFullSnapshot(match);
      return;
    }

    match.game.setPaused(playerId, paused);
  }

  private sendLeaderboard(playerId: string, mode: LeaderboardMode): void {
    const client = this.clients.get(playerId);

    if (client === undefined) {
      return;
    }

    this.send(client.socket, {
      type: "leaderboard",
      mode,
      entries: leaderboardStore.getTop(mode),
    });
  }

  private submitLeaderboardEntry(playerId: string, playerName: string): void {
    const client = this.clients.get(playerId);
    const pending = this.pendingLeaderboardSubmissions.get(playerId);

    if (client === undefined || pending === undefined) {
      console.log(`[leaderboard] submitLeaderboardEntry ignored player=${playerId} pending=${pending !== undefined}`);
      return;
    }

    this.pendingLeaderboardSubmissions.delete(playerId);

    const entry = leaderboardStore.insertEntry({
      mode: pending.mode,
      playerName,
      characterKind: pending.characterKind,
      durationSeconds: pending.durationSeconds,
      score: pending.score,
    });

    console.log(
      `[leaderboard] inserted row player=${playerId} mode=${pending.mode} score=${entry.score} name=${entry.playerName}`,
    );

    this.send(client.socket, {
      type: "leaderboardSubmitted",
      mode: pending.mode,
      entry,
      entries: leaderboardStore.getTop(pending.mode),
    });
  }

  private submitReplayForVerification(
    playerId: string,
    replay: ReplayVerificationReplay,
  ): void {
    const client = this.clients.get(playerId);

    if (client === undefined) {
      return;
    }

    console.log(
      `[leaderboard] replay verification starts player=${playerId} version=${replay.version} finalScore=${replay.finalScore} finalTick=${replay.finalTick}`,
    );
    console.log("[leaderboard] replay verification input stats", analyzeReplayInputs(replay));

    const now = Date.now();
    const lastSubmitAt = this.lastReplayVerificationSubmitAt.get(playerId) ?? 0;

    if (now - lastSubmitAt < REPLAY_VERIFICATION_COOLDOWN_MS) {
      this.logReplayVerificationRejected(playerId, "Replay verification is on cooldown", replay);
      this.send(client.socket, {
        type: "replayVerificationRejected",
        reason: "Replay verification is on cooldown",
      });
      return;
    }

    this.lastReplayVerificationSubmitAt.set(playerId, now);

    const result = verifyGameReplay(replay);

    if (!result.valid) {
      this.logReplayVerificationRejected(playerId, result.reason ?? "Replay verification failed", replay, result);
      this.pendingLeaderboardSubmissions.delete(playerId);
      this.send(client.socket, {
        type: "replayVerificationRejected",
        reason: result.reason ?? "Replay verification failed",
      });
      return;
    }

    const mode: LeaderboardMode = "single";
    const place = leaderboardStore.getEligiblePlace(mode, result.actualScore);
    const eligible = place !== undefined;

    console.log(
      `[leaderboard] replay verification valid player=${playerId} actualScore=${result.actualScore} place=${place ?? "none"} eligible=${eligible}`,
    );

    if (place === undefined) {
      this.logReplayVerificationRejected(playerId, "Score did not reach leaderboard", replay, result);
      this.pendingLeaderboardSubmissions.delete(playerId);
      this.send(client.socket, {
        type: "replayVerificationRejected",
        reason: "Score did not reach leaderboard",
      });
      return;
    }

    this.pendingLeaderboardSubmissions.delete(playerId);
    this.pendingLeaderboardSubmissions.set(playerId, {
      mode,
      characterKind: replay.playerKind,
      durationSeconds: Math.floor(replay.finalTick / TICK_RATE),
      score: result.actualScore,
    });

    console.log(
      `[leaderboard] replay verification accepted player=${playerId} actualScore=${result.actualScore} place=${place} eligible=${eligible}`,
    );
    console.log(
      `[leaderboard] pending submission created player=${playerId} mode=${mode} score=${result.actualScore} character=${replay.playerKind}`,
    );

    this.send(client.socket, {
      type: "replayVerificationAccepted",
      mode,
      score: result.actualScore,
      place,
    });
  }

  private logReplayVerificationRejected(
    playerId: string,
    reason: string,
    replay: ReplayVerificationReplay,
    result?: ReplayVerificationResult,
  ): void {
    const expectedScore = result?.expectedScore ?? replay.finalScore;
    const actualScore = result?.actualScore ?? 0;
    const expectedFinalTick = result?.expectedFinalTick ?? replay.finalTick;
    const actualFinalTick = result?.actualFinalTick ?? 0;
    const scoreDelta = actualScore - expectedScore;

    console.log(
      `[leaderboard] replay verification rejected player=${playerId} reason=${reason} expectedScore=${expectedScore} actualScore=${actualScore} scoreDelta=${scoreDelta} expectedFinalTick=${expectedFinalTick} actualFinalTick=${actualFinalTick}`,
    );
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
      leaderboardProcessedPlayerIds: new Set<string>(),
      lastFullSnapshot: undefined,
      lastNetworkSnapshot: undefined,
      pendingEvents: [],
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
    this.pendingLeaderboardSubmissions.delete(playerId);

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

  private isSingleplayerMatch(match: Match): boolean {
    return match.playerIds.size === 1;
  }

  private processLeaderboardEligibility(match: Match, snapshot: GameSnapshot): void {
    const mode: LeaderboardMode = this.isSingleplayerMatch(match) ? "single" : "multi";

    for (const player of snapshot.players) {
      if (player.alive || match.leaderboardProcessedPlayerIds.has(player.playerId)) {
        continue;
      }

      match.leaderboardProcessedPlayerIds.add(player.playerId);

      const place = leaderboardStore.getEligiblePlace(mode, player.score);

      if (place === undefined) {
        continue;
      }

      this.pendingLeaderboardSubmissions.set(player.playerId, {
        mode,
        characterKind: player.kind,
        durationSeconds: Math.floor(snapshot.tick / TICK_RATE),
        score: player.score,
      });

      const client = this.clients.get(player.playerId);

      if (client === undefined) {
        continue;
      }

      this.send(client.socket, {
        type: "leaderboardEligible",
        mode,
        score: player.score,
        place,
      });
    }
  }

  private broadcastFullSnapshot(match: Match): void {
    const snapshot = withEvents(match.game.createSnapshot(), match.pendingEvents);

    match.lastFullSnapshot = snapshot;
    match.lastNetworkSnapshot = snapshot;
    match.pendingEvents = [];
    match.ticksSinceFullSnapshot = 0;

    this.broadcastToMatch(match, {
      type: "snapshot",
      snapshot,
    });
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

function analyzeReplayInputs(replay: ReplayVerificationReplay): {
  finalTick: number;
  inputsLength?: number;
  inputRunsLength?: number;
  firstInputFrames?: readonly ReplayInputFrame[];
  lastInputFrames?: readonly ReplayInputFrame[];
  firstInputRuns?: readonly ReplayInputRun[];
  lastInputRuns?: readonly ReplayInputRun[];
  estimatedCompressionRatio?: number;
  duplicateTickCount: number;
  missingTickCount: number;
} {
  if (replay.version === 2) {
    return analyzeReplayInputRuns(replay);
  }

  return analyzeReplayInputFrames(replay);
}

function analyzeReplayInputFrames(replay: Extract<ReplayVerificationReplay, { version: 1 }>): {
  finalTick: number;
  inputsLength: number;
  firstInputFrames: Extract<ReplayVerificationReplay, { version: 1 }>["inputs"];
  lastInputFrames: Extract<ReplayVerificationReplay, { version: 1 }>["inputs"];
  duplicateTickCount: number;
  missingTickCount: number;
} {
  const seenTicks = new Set<number>();
  let duplicateTickCount = 0;
  let missingTickCount = 0;
  let previousTick = 0;

  for (const input of replay.inputs) {
    if (seenTicks.has(input.tick)) {
      duplicateTickCount += 1;
    }

    if (previousTick === 0 && input.tick > 1) {
      missingTickCount += input.tick - 1;
    } else if (previousTick > 0 && input.tick > previousTick + 1) {
      missingTickCount += input.tick - previousTick - 1;
    }

    seenTicks.add(input.tick);
    previousTick = input.tick;
  }

  return {
    finalTick: replay.finalTick,
    inputsLength: replay.inputs.length,
    firstInputFrames: replay.inputs.slice(0, 5),
    lastInputFrames: replay.inputs.slice(-5),
    duplicateTickCount,
    missingTickCount,
  };
}

function analyzeReplayInputRuns(replay: Extract<ReplayVerificationReplay, { version: 2 }>): {
  finalTick: number;
  inputRunsLength: number;
  firstInputRuns: Extract<ReplayVerificationReplay, { version: 2 }>["inputRuns"];
  lastInputRuns: Extract<ReplayVerificationReplay, { version: 2 }>["inputRuns"];
  estimatedCompressionRatio: number;
  duplicateTickCount: number;
  missingTickCount: number;
} {
  let logicalInputCount = 0;
  let duplicateTickCount = 0;
  let missingTickCount = 0;
  let previousEndTick = 0;

  for (const [tick, length] of replay.inputRuns) {
    logicalInputCount += Math.max(0, length);

    if (tick <= previousEndTick) {
      duplicateTickCount += 1;
    } else if (previousEndTick === 0 && tick > 1) {
      missingTickCount += tick - 1;
    } else if (previousEndTick > 0 && tick > previousEndTick + 1) {
      missingTickCount += tick - previousEndTick - 1;
    }

    previousEndTick = Math.max(previousEndTick, tick + length - 1);
  }

  return {
    finalTick: replay.finalTick,
    inputRunsLength: replay.inputRuns.length,
    firstInputRuns: replay.inputRuns.slice(0, 5),
    lastInputRuns: replay.inputRuns.slice(-5),
    estimatedCompressionRatio: replay.inputRuns.length === 0 ? 1 : logicalInputCount / replay.inputRuns.length,
    duplicateTickCount,
    missingTickCount,
  };
}

function hasDeltaChanges(delta: DeltaSnapshot): boolean {
  return Object.keys(delta).some((key) => key !== "tick");
}

function withEvents(snapshot: GameSnapshot, events: GameEvent[]): GameSnapshot {
  return {
    ...snapshot,
    events: events.map((event) => ({ ...event })),
  };
}
