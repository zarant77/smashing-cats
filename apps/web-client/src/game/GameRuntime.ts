import { CHARACTERS, type Game, SnapshotStore } from "@smashing-cats/core";
import { LocalPlayerPredictor, SnapshotInterpolator } from "@smashing-cats/client-netcode";
import type {
  CharacterDefinition,
  EntityKind,
  GameSnapshot,
  InputMessage,
  PlayerId,
  PlayerInput,
  ServerToClientMessage,
} from "@smashing-cats/protocol";

import { AudioEventPlayer } from "../audio/AudioEventPlayer.js";
import { playSound } from "../audio/audio.js";
import { consumePauseToggle, isPaused, readInput } from "../input.js";
import { createSocket, parseServerMessage, sendClientMessage } from "../network/clientConnection.js";
import type { TouchControls } from "../ui/TouchControls.js";
import { createLocalGame } from "./localGame.js";

const LOCAL_PLAYER_ID = "p1";

type GameRuntimeOptions = {
  multiplayer: boolean;
  matchCode: string | undefined;
  touchControls: TouchControls | undefined;
  onCharacterStateChange(): void;
  render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void;
};

export class GameRuntime {
  private readonly multiplayer: boolean;
  private readonly matchCode: string | undefined;
  private readonly touchControls: TouchControls | undefined;
  private readonly onCharacterStateChange: () => void;
  private readonly renderFrame: (snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined) => void;

  private charactersValue: CharacterDefinition[];
  private hasSelectedCharacterValue = false;
  private playerId: PlayerId | undefined;
  private inputSeq = 1;
  private wasJumpPressed = false;
  private wasSmashing = false;
  private interpolator = new SnapshotInterpolator();
  private snapshotStore = new SnapshotStore();
  private predictor = new LocalPlayerPredictor();
  private audioEventPlayer = new AudioEventPlayer();
  private socket: WebSocket | undefined;
  private localGame: Game | undefined;
  private localSnapshot: GameSnapshot | undefined;
  private lastLocalUpdateAt = performance.now();

  public constructor(options: GameRuntimeOptions) {
    this.multiplayer = options.multiplayer;
    this.matchCode = options.matchCode;
    this.touchControls = options.touchControls;
    this.onCharacterStateChange = options.onCharacterStateChange;
    this.renderFrame = options.render;

    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.socket = this.multiplayer ? createSocket() : undefined;
    this.localGame = this.multiplayer ? undefined : createLocalGame();

    this.bindSocketEvents();
  }

  public get characters(): CharacterDefinition[] {
    return this.charactersValue;
  }

  public get hasSelectedCharacter(): boolean {
    return this.hasSelectedCharacterValue;
  }

  public restart(): void {
    this.hasSelectedCharacterValue = false;
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.inputSeq = 1;
    this.wasJumpPressed = false;
    this.wasSmashing = false;
    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.interpolator = new SnapshotInterpolator();
    this.snapshotStore = new SnapshotStore();
    this.predictor = new LocalPlayerPredictor();
    this.audioEventPlayer = new AudioEventPlayer();
    this.localSnapshot = undefined;
    this.lastLocalUpdateAt = performance.now();

    if (this.multiplayer) {
      this.socket?.close();
      this.socket = createSocket();
      this.bindSocketEvents();
    } else {
      this.localGame = createLocalGame();
    }

    this.onCharacterStateChange();
    this.renderFrame(undefined, undefined);
  }

  public selectCharacter(characterKind: EntityKind): boolean {
    if (
      this.multiplayer &&
      (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || this.matchCode === undefined)
    ) {
      return false;
    }

    this.hasSelectedCharacterValue = true;
    this.onCharacterStateChange();

    if (this.multiplayer) {
      const matchCode = this.matchCode;

      if (matchCode === undefined) {
        return false;
      }

      sendClientMessage(this.socket, {
        type: "selectCharacter",
        characterKind,
        matchCode,
      });
      return true;
    }

    this.playerId = LOCAL_PLAYER_ID;
    this.localGame = createLocalGame();
    this.localGame.addPlayer(this.playerId, characterKind);
    this.localSnapshot = this.localGame.createSnapshot();

    return true;
  }

  public start(): void {
    this.frame();
  }

  private bindSocketEvents(): void {
    if (this.socket === undefined) {
      return;
    }

    this.socket.addEventListener("open", () => {
      sendClientMessage(this.socket, { type: "join" });
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
    }
  }

  private frame(): void {
    const currentPlayerId = this.playerId;
    const canPlay = currentPlayerId !== undefined && this.hasSelectedCharacterValue;
    const canSend = this.multiplayer && this.socket?.readyState === WebSocket.OPEN && canPlay;

    if (consumePauseToggle() && canPlay) {
      if (this.multiplayer) {
        sendClientMessage(this.socket, {
          type: "pause",
          paused: isPaused(),
        });
      } else {
        this.localGame?.setPaused(currentPlayerId, isPaused());
      }
    }

    const input = this.readPlayerInput();
    const currentInputSeq = this.inputSeq++;
    const jumpPressed = input.jump && !this.wasJumpPressed;
    this.wasJumpPressed = input.jump;

    if (canSend && !isPaused()) {
      this.sendInput(currentInputSeq, input);
    }

    this.updateLocalGame(canPlay, currentPlayerId, currentInputSeq, input);

    const snapshot = this.getRenderSnapshot(currentInputSeq, input);
    const renderedPlayer = snapshot?.players.find((player) => player.playerId === this.playerId);

    if (jumpPressed && this.hasSelectedCharacterValue && renderedPlayer !== undefined && !isPaused()) {
      playSound(renderedPlayer.smashing && !this.wasSmashing ? "PlayerSmash" : "PlayerJump");
    }

    this.wasSmashing = renderedPlayer?.smashing ?? false;
    this.audioEventPlayer.play(snapshot, this.playerId);
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
      return;
    }

    if (!isPaused()) {
      this.localGame.setInput(currentPlayerId, input, undefined, currentInputSeq);
    }

    const now = performance.now();
    const dt = Math.min(0.25, (now - this.lastLocalUpdateAt) / 1000);
    this.lastLocalUpdateAt = now;

    this.localGame.update(dt);
    this.localSnapshot = this.localGame.createSnapshot();
  }

  private getRenderSnapshot(currentInputSeq: number, input: PlayerInput): GameSnapshot | undefined {
    if (!this.multiplayer) {
      return this.localSnapshot;
    }

    const interpolatedSnapshot = this.interpolator.get(this.playerId);
    const latestSnapshot = this.interpolator.getLatest();
    const localPlayer = latestSnapshot?.players.find((player) => player.playerId === this.playerId);

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
