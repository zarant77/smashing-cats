import { CHARACTERS, FIXED_DT, Game, SnapshotStore } from "@smashing-cats/core";
import { LocalPlayerPredictor, SnapshotInterpolator } from "@smashing-cats/client-netcode";
import type {
  CharacterDefinition,
  EntitySnapshot,
  GameSnapshot,
  GameReplay,
  InputMessage,
  ClientToServerMessage,
  LeaderboardEntry,
  LeaderboardEligibleMessage,
  LeaderboardMode,
  ReplayVerificationAcceptedMessage,
  ReplayVerificationRejectedMessage,
  LeaderboardSubmittedMessage,
  PlayerId,
  PlayerInput,
  PlayerSnapshot,
  ServerToClientMessage,
} from "@smashing-cats/protocol";

import { storage } from "../storage.js";
import { consumePauseToggle, isPaused, setPaused as setInputPaused, togglePause, readInput } from "../input.js";
import { createSocket, parseServerMessage, sendClientMessage } from "../network/clientConnection.js";
import type { TouchControls } from "../ui/TouchControls.js";
import { createLocalGame, createLocalGameSeed } from "./localGame.js";
import { ReplayRecorder } from "./ReplayRecorder.js";

const LOCAL_PLAYER_ID = "p1";
const VIEWPORT_RIGHT_PADDING = 48;

type GameRuntimeOptions = {
  multiplayer: boolean;
  matchCode: string | undefined;
  touchControls: TouchControls | undefined;
  onCharacterStateChange(): void;
  onLeaderboard(entries: LeaderboardEntry[]): void;
  onLeaderboardEligible(message: LeaderboardEligibleMessage): void;
  onLeaderboardSubmitted(message: LeaderboardSubmittedMessage): void;
  onReplayVerificationAccepted(message: ReplayVerificationAcceptedMessage): void;
  onReplayVerificationRejected(message: ReplayVerificationRejectedMessage): void;
  getVisibleWorldWidth(): number;
  render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void;
};

export class GameRuntime {
  private readonly multiplayer: boolean;
  private readonly matchCode: string | undefined;
  private readonly touchControls: TouchControls | undefined;
  private readonly onCharacterStateChange: () => void;
  private readonly onLeaderboard: (entries: LeaderboardEntry[]) => void;
  private readonly onLeaderboardEligible: (message: LeaderboardEligibleMessage) => void;
  private readonly onLeaderboardSubmitted: (message: LeaderboardSubmittedMessage) => void;
  private readonly onReplayVerificationAccepted: (message: ReplayVerificationAcceptedMessage) => void;
  private readonly onReplayVerificationRejected: (message: ReplayVerificationRejectedMessage) => void;
  private readonly getVisibleWorldWidth: () => number;
  private readonly renderFrame: (snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined) => void;

  private charactersValue: CharacterDefinition[];
  private hasSelectedCharacterValue = false;
  private playerId: PlayerId | undefined;
  private inputSeq = 1;
  private lastSentInputSeq = 0;
  private lastSentInput: PlayerInput | undefined;
  private interpolator = new SnapshotInterpolator();
  private snapshotStore = new SnapshotStore();
  private predictor = new LocalPlayerPredictor();
  private socket: WebSocket | undefined;
  private localGame: Game | undefined;
  private replayRecorder: ReplayRecorder | undefined;
  private completedReplay: GameReplay | undefined;
  private pendingClientMessages: ClientToServerMessage[] = [];
  private previousLocalSnapshot: GameSnapshot | undefined;
  private localSnapshot: GameSnapshot | undefined;
  private lastLocalUpdateAt = performance.now();
  private localUpdateAccumulator = 0;

  public constructor(options: GameRuntimeOptions) {
    this.multiplayer = options.multiplayer;
    this.matchCode = options.matchCode;
    this.touchControls = options.touchControls;
    this.onCharacterStateChange = options.onCharacterStateChange;
    this.onLeaderboard = options.onLeaderboard;
    this.onLeaderboardEligible = options.onLeaderboardEligible;
    this.onLeaderboardSubmitted = options.onLeaderboardSubmitted;
    this.onReplayVerificationAccepted = options.onReplayVerificationAccepted;
    this.onReplayVerificationRejected = options.onReplayVerificationRejected;
    this.getVisibleWorldWidth = options.getVisibleWorldWidth;
    this.renderFrame = options.render;

    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.socket = createSocket();
    this.localGame = this.multiplayer ? undefined : createLocalGame({ tutorialEnabled: !storage.tutorialDone });

    this.bindSocketEvents();
  }

  public get characters(): CharacterDefinition[] {
    return this.charactersValue;
  }

  public get hasSelectedCharacter(): boolean {
    return this.hasSelectedCharacterValue;
  }

  public restart(): void {
    setInputPaused(false);

    this.hasSelectedCharacterValue = false;
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.inputSeq = 1;
    this.lastSentInputSeq = 0;
    this.lastSentInput = undefined;
    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.interpolator = new SnapshotInterpolator();
    this.snapshotStore = new SnapshotStore();
    this.predictor = new LocalPlayerPredictor();
    this.replayRecorder = undefined;
    this.completedReplay = undefined;
    this.pendingClientMessages = [];
    this.previousLocalSnapshot = undefined;
    this.localSnapshot = undefined;
    this.lastLocalUpdateAt = performance.now();
    this.localUpdateAccumulator = 0;

    if (this.multiplayer) {
      this.socket?.close();
      this.socket = createSocket();
      this.bindSocketEvents();
    } else {
      this.localGame = createLocalGame({ tutorialEnabled: !storage.tutorialDone });
    }

    this.onCharacterStateChange();
    this.renderFrame(undefined, undefined);
  }

  public selectCharacter(characterKind: string): boolean {
    if (
      this.multiplayer &&
      (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || this.matchCode === undefined)
    ) {
      return false;
    }

    this.hasSelectedCharacterValue = true;
    setInputPaused(false);
    this.onCharacterStateChange();

    if (this.multiplayer) {
      const matchCode = this.matchCode;

      if (matchCode === undefined) {
        return false;
      }

      this.sendClientMessage({
        type: "selectCharacter",
        characterKind,
        matchCode,
      });
      return true;
    }

    this.playerId = LOCAL_PLAYER_ID;
    const seed = createLocalGameSeed();

    this.localGame = createLocalGame({ seed, tutorialEnabled: !storage.tutorialDone });
    this.localGame.addPlayer(this.playerId, characterKind);
    this.localSnapshot = this.localGame.createSnapshot();
    this.previousLocalSnapshot = this.localSnapshot;
    this.completedReplay = undefined;
    this.replayRecorder = new ReplayRecorder({
      gameVersion: __ASSET_VERSION__,
      seed,
      playerKind: characterKind,
    });

    return true;
  }

  public start(): void {
    this.frame();
  }

  public requestLeaderboard(): void {
    this.sendClientMessage({
      type: "getLeaderboard",
      mode: this.getLeaderboardMode(),
    });
  }

  public submitLeaderboardEntry(playerName: string): void {
    this.sendClientMessage({
      type: "submitLeaderboardEntry",
      playerName,
    });
  }

  public submitReplayForVerification(replay: GameReplay): void {
    console.debug("[leaderboard] submitting replay for verification", {
      finalScore: replay.finalScore,
      finalTick: replay.finalTick,
      inputFrames: replay.inputs.length,
      mode: replay.mode,
      seed: replay.seed,
    });

    this.sendClientMessage({
      type: "submitReplayForVerification",
      replay,
    });
  }

  public getCompletedReplay(): GameReplay | undefined {
    return this.completedReplay === undefined
      ? undefined
      : {
          ...this.completedReplay,
          inputs: this.completedReplay.inputs.map((input) => ({ ...input })),
        };
  }

  public setPaused(paused: boolean): void {
    if (!this.isGameRunning()) {
      return;
    }

    setInputPaused(paused);

    if (this.multiplayer) {
      this.sendClientMessage({
        type: "pause",
        paused,
      });
      this.lastSentInput = undefined;
      return;
    }

    if (this.localGame === undefined) {
      return;
    }

    this.localGame.setGamePaused(paused);
    this.localSnapshot = this.localGame.createSnapshot();
    this.previousLocalSnapshot = this.localSnapshot;
    this.localUpdateAccumulator = 0;
    this.lastLocalUpdateAt = performance.now();
  }

  public togglePause(): void {
    if (this.isGameRunning()) {
      togglePause();
      this.setPaused(isPaused());
    }
  }

  public isGameRunning(): boolean {
    if (!this.hasSelectedCharacterValue || this.playerId === undefined) {
      return false;
    }

    const snapshot = this.multiplayer ? this.interpolator.getLatest() : this.localSnapshot;
    const player = snapshot?.players.find((item) => item.playerId === this.playerId);

    return player?.alive !== false;
  }

  public isPaused(): boolean {
    const snapshot = this.multiplayer ? this.interpolator.getLatest() : this.localSnapshot;
    const player = snapshot?.players.find((item) => item.playerId === this.playerId);

    return snapshot?.gamePaused === true || player?.paused === true || isPaused();
  }

  private bindSocketEvents(): void {
    if (this.socket === undefined) {
      return;
    }

    this.socket.addEventListener("open", () => {
      if (this.multiplayer) {
        sendClientMessage(this.socket, { type: "join" });
      }

      this.flushPendingClientMessages();
    });

    this.socket.addEventListener("message", (event) => {
      const message = parseServerMessage(event.data);

      if (message !== undefined) {
        this.handleServerMessage(message);
      }
    });
  }

  private handleServerMessage(message: ServerToClientMessage): void {
    if (message.type === "welcome") {
      if (!this.multiplayer) {
        return;
      }

      this.playerId = message.playerId;
      this.charactersValue = message.characters;
      this.onCharacterStateChange();
      return;
    }

    if (message.type === "snapshot") {
      const snapshot = this.snapshotStore.setFullSnapshot(message.snapshot);
      this.interpolator.add(snapshot);
      return;
    }

    if (message.type === "delta") {
      const snapshot = this.snapshotStore.applyDelta(message.delta);

      if (snapshot !== undefined) {
        this.interpolator.add(snapshot);
      }

      return;
    }

    if (message.type === "leaderboard") {
      console.debug("[leaderboard] received leaderboard", {
        mode: message.mode,
        entries: message.entries.length,
      });
      this.onLeaderboard(message.entries);
      return;
    }

    if (message.type === "leaderboardEligible") {
      console.debug("[leaderboard] received leaderboardEligible", {
        mode: message.mode,
        score: message.score,
      });
      this.onLeaderboardEligible(message);
      return;
    }

    if (message.type === "leaderboardSubmitted") {
      console.debug("[leaderboard] received leaderboardSubmitted", {
        mode: message.mode,
        score: message.entry.score,
        entries: message.entries.length,
      });
      this.onLeaderboardSubmitted(message);
      return;
    }

    if (message.type === "replayVerificationAccepted") {
      console.debug("[leaderboard] received replayVerificationAccepted", {
        mode: message.mode,
        score: message.score,
        place: message.place,
      });
      this.onReplayVerificationAccepted(message);
      return;
    }

    if (message.type === "replayVerificationRejected") {
      console.debug("[leaderboard] received replayVerificationRejected", {
        reason: message.reason,
      });
      this.onReplayVerificationRejected(message);
    }
  }

  private sendClientMessage(message: ClientToServerMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      sendClientMessage(this.socket, message);
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      this.pendingClientMessages.push(message);
    }
  }

  private flushPendingClientMessages(): void {
    const messages = this.pendingClientMessages;

    this.pendingClientMessages = [];

    for (const message of messages) {
      this.sendClientMessage(message);
    }
  }

  private getLeaderboardMode(): LeaderboardMode {
    return this.multiplayer ? "multi" : "single";
  }

  private frame(): void {
    const currentPlayerId = this.playerId;
    const canPlay = currentPlayerId !== undefined && this.hasSelectedCharacterValue;
    const canSend = this.multiplayer && this.socket?.readyState === WebSocket.OPEN && canPlay;

    if (consumePauseToggle()) {
      if (this.isGameRunning()) {
        this.setPaused(isPaused());
      } else {
        setInputPaused(false);
      }
    }

    const input = this.applyLocalViewportRightGuard(this.readPlayerInput(), currentPlayerId);
    const currentInputSeq = this.getCurrentInputSeq(canSend && !isPaused(), input);

    this.updateLocalGame(canPlay, currentPlayerId, currentInputSeq, input);

    const snapshot = this.getRenderSnapshot(currentInputSeq, input);

    this.renderFrame(snapshot, this.playerId);

    requestAnimationFrame(() => this.frame());
  }

  private readPlayerInput(): PlayerInput {
    const keyboardInput = readInput();
    const touchInput = this.touchControls?.getInput();

    return {
      left: keyboardInput.left || touchInput?.left === true,
      right: keyboardInput.right || touchInput?.right === true,
      jump: keyboardInput.jump || touchInput?.jump === true,
    };
  }

  private applyLocalViewportRightGuard(input: PlayerInput, playerId: PlayerId | undefined): PlayerInput {
    if (this.multiplayer || !input.right || playerId === undefined) {
      return input;
    }

    const snapshot = this.localSnapshot;
    const player = snapshot?.players.find((item) => item.playerId === playerId);

    if (player === undefined) {
      return input;
    }

    const visibleWorldWidth = this.getVisibleWorldWidth();

    if (!Number.isFinite(visibleWorldWidth) || visibleWorldWidth <= 0) {
      return input;
    }

    const safeRightX = visibleWorldWidth - player.size[0] - VIEWPORT_RIGHT_PADDING;

    if (player.x < safeRightX) {
      return input;
    }

    return {
      ...input,
      right: false,
    };
  }

  private getCurrentInputSeq(canSend: boolean, input: PlayerInput): number {
    if (!this.multiplayer) {
      return this.inputSeq++;
    }

    if (canSend && this.shouldSendInput(input)) {
      const inputSeq = this.inputSeq++;

      this.sendInput(inputSeq, input);
      this.lastSentInputSeq = inputSeq;
      this.lastSentInput = { ...input };
    }

    return this.lastSentInputSeq;
  }

  private shouldSendInput(input: PlayerInput): boolean {
    return hasActiveInput(input) || this.lastSentInput === undefined || !isSameInput(this.lastSentInput, input);
  }

  private sendInput(inputSeq: number, input: PlayerInput): void {
    const snapshotTick = this.interpolator.getRenderedTick();

    const inputMessage: InputMessage =
      snapshotTick === undefined
        ? {
            type: "input",
            inputSeq,
            input,
          }
        : {
            type: "input",
            inputSeq,
            snapshotTick,
            input,
          };

    sendClientMessage(this.socket, inputMessage);
  }

  private updateLocalGame(
    canPlay: boolean,
    currentPlayerId: PlayerId | undefined,
    currentInputSeq: number,
    input: PlayerInput,
  ): void {
    if (this.multiplayer || !canPlay || this.localGame === undefined || currentPlayerId === undefined) {
      this.lastLocalUpdateAt = performance.now();
      this.localUpdateAccumulator = 0;
      return;
    }

    if (!isPaused()) {
      this.localGame.setInput(currentPlayerId, input, undefined, currentInputSeq);
    }

    const now = performance.now();
    const dt = Math.min(0.25, (now - this.lastLocalUpdateAt) / 1000);
    this.lastLocalUpdateAt = now;
    this.localUpdateAccumulator += dt;

    while (this.localUpdateAccumulator >= FIXED_DT) {
      this.previousLocalSnapshot = this.localSnapshot;
      this.localGame.update(FIXED_DT);
      this.localSnapshot = this.localGame.createSnapshot();
      this.replayRecorder?.recordInput(this.localSnapshot.tick, input);
      this.completeLocalReplay(this.localSnapshot, currentPlayerId);
      saveTutorialDoneIfFinished(this.previousLocalSnapshot, this.localSnapshot);
      this.localUpdateAccumulator -= FIXED_DT;
    }
  }

  private completeLocalReplay(snapshot: GameSnapshot, playerId: PlayerId): void {
    if (this.completedReplay !== undefined) {
      return;
    }

    const replay = this.replayRecorder?.complete(snapshot, playerId);

    if (replay === undefined) {
      return;
    }

    this.completedReplay = replay;
    this.submitReplayForVerification(replay);
  }

  private getRenderSnapshot(currentInputSeq: number, input: PlayerInput): GameSnapshot | undefined {
    if (!this.multiplayer) {
      return interpolateSnapshot(
        this.previousLocalSnapshot,
        this.localSnapshot,
        this.localUpdateAccumulator / FIXED_DT,
      );
    }

    const interpolatedSnapshot = this.interpolator.get(this.playerId);
    const latestSnapshot = this.interpolator.getLatest();
    const localPlayer = latestSnapshot?.players.find((player) => player.playerId === this.playerId);

    if (latestSnapshot?.gamePaused === true) {
      return interpolatedSnapshot;
    }

    if (localPlayer?.paused === true) {
      return interpolatedSnapshot;
    }

    return this.predictor.apply(
      interpolatedSnapshot,
      latestSnapshot,
      this.playerId,
      currentInputSeq,
      input,
      this.charactersValue,
    );
  }
}

function interpolateSnapshot(
  previous: GameSnapshot | undefined,
  current: GameSnapshot | undefined,
  alpha: number,
): GameSnapshot | undefined {
  if (current === undefined) {
    return undefined;
  }

  if (previous === undefined || previous.tick >= current.tick) {
    return current;
  }

  const clampedAlpha = clamp01(alpha);

  return {
    ...current,
    tick: Math.round(lerp(previous.tick, current.tick, clampedAlpha)),
    world: {
      ...current.world,
      scrollX: lerp(previous.world.scrollX, current.world.scrollX, clampedAlpha),
    },
    players: current.players.map((player) => interpolatePlayer(previous.players, player, clampedAlpha)),
    entities: current.entities.map((entity) => interpolateEntity(previous.entities, entity, clampedAlpha)),
  };
}

function interpolatePlayer(previousPlayers: PlayerSnapshot[], current: PlayerSnapshot, alpha: number): PlayerSnapshot {
  const previous = previousPlayers.find((player) => player.playerId === current.playerId);

  if (previous === undefined) {
    return current;
  }

  return {
    ...current,
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

function interpolateEntity(previousEntities: EntitySnapshot[], current: EntitySnapshot, alpha: number): EntitySnapshot {
  const previous = previousEntities.find((entity) => entity.id === current.id);

  if (previous === undefined) {
    return current;
  }

  return {
    ...current,
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function saveTutorialDoneIfFinished(previous: GameSnapshot | undefined, current: GameSnapshot | undefined): void {
  if (
    (previous?.tutorial.completed !== true && current?.tutorial.completed === true) ||
    (previous?.tutorial.active === true && current?.tutorial.active === false)
  ) {
    storage.tutorialDone = true;
  }
}

function isSameInput(left: PlayerInput, right: PlayerInput): boolean {
  return left.left === right.left && left.right === right.right && left.jump === right.jump;
}

function hasActiveInput(input: PlayerInput): boolean {
  return input.left || input.right || input.jump;
}
