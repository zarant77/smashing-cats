import WebSocket, { type RawData } from "ws";
import {
  normalizeMessage,
  minifyMessage,
  type CharacterDefinition,
  type GameSnapshot,
  type PlayerInputCommand,
  type PlayerId,
  type ServerToClientMessage,
  type ClientToServerMessage,
} from "@smashing-cats/protocol";
import { SnapshotStore } from "@smashing-cats/core";

export type PlayerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

type CliConnectionOptions = {
  serverUrl: string;
  characterKind: string;
  matchCode: string;

  onWelcome: (playerId: PlayerId, characters: CharacterDefinition[]) => void;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onStatus: (message: string) => void;
};

export class CliConnection {
  private readonly snapshotStore = new SnapshotStore();

  private socket: WebSocket | undefined;
  private playerId: PlayerId | undefined;
  private hasSelectedCharacter = false;

  public constructor(private readonly options: CliConnectionOptions) {}

  public connect(): void {
    this.options.onStatus(`Connecting to ${this.options.serverUrl}...`);

    this.socket = new WebSocket(this.options.serverUrl);

    this.socket.on("open", () => {
      this.options.onStatus("Connected");

      this.send({ type: "join" });
    });

    this.socket.on("message", (data: RawData) => {
      this.handleMessage(data.toString());
    });

    this.socket.on("close", () => {
      this.options.onStatus("Disconnected");
    });

    this.socket.on("error", (error: Error) => {
      this.options.onStatus(`Socket error: ${error.message}`);
    });
  }

  public selectCharacter(): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined) {
      return;
    }

    this.hasSelectedCharacter = true;

    this.send({
      type: "selectCharacter",
      characterKind: this.options.characterKind,
      matchCode: this.options.matchCode,
    });
  }

  public sendInput(inputSeq: number, input: PlayerInput, snapshotTick?: number): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || !this.hasSelectedCharacter) {
      return;
    }

    this.send(
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
          },
    );
  }

  public sendInputCommands(commands: PlayerInputCommand[]): void {
    if (
      commands.length === 0 ||
      this.socket?.readyState !== WebSocket.OPEN ||
      this.playerId === undefined ||
      !this.hasSelectedCharacter
    ) {
      return;
    }

    this.send({
      type: "input",
      commands,
    });
  }

  public sendPause(paused: boolean): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || !this.hasSelectedCharacter) {
      return;
    }

    this.send({
      type: "pause",
      paused,
    });
  }

  public close(): void {
    this.socket?.close();
  }

  private handleMessage(raw: string): void {
    const message = this.parseServerMessage(raw);

    if (message === undefined) {
      return;
    }

    if (message.type === "welcome") {
      this.playerId = message.playerId;
      this.options.onWelcome(message.playerId, message.characters);
      this.selectCharacter();
      return;
    }

    if (message.type === "snapshot") {
      const snapshot = this.snapshotStore.setFullSnapshot(message.snapshot);

      if (snapshot !== undefined) {
        this.options.onSnapshot(snapshot);
      }

      return;
    }

    if (message.type === "delta") {
      const snapshot = this.snapshotStore.applyDelta(message.delta);

      if (snapshot !== undefined) {
        this.options.onSnapshot(snapshot);
      }

      return;
    }
  }

  private parseServerMessage(data: unknown): ServerToClientMessage | undefined {
    if (typeof data !== "string") {
      return undefined;
    }

    try {
      return normalizeMessage(JSON.parse(data)) as unknown as ServerToClientMessage;
    } catch {
      return undefined;
    }
  }

  private send(message: unknown): void {
    this.socket?.send(minifyMessage(message as ClientToServerMessage));
  }
}
