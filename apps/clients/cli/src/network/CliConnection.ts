import WebSocket, { type RawData } from "ws";
import {
  normalizeServerMessage,
  toMiniClientMessage,
  type CharacterDefinition,
  type EntityKind,
  type GameSnapshot,
  type InputMessage,
  type PlayerId,
  type ServerToClientMessage,
} from "@smashing-cats/protocol";
import { SnapshotStore } from "@smashing-cats/core";

export type PlayerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

type CliConnectionOptions = {
  serverUrl: string;
  characterKind: EntityKind;
  sessionCode: string;

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

      this.send(
        toMiniClientMessage({
          type: "join",
          name: "Cat",
        }),
      );
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

    this.send(
      toMiniClientMessage({
        type: "selectCharacter",
        characterKind: this.options.characterKind,
      }),
    );
  }

  public sendInput(inputSeq: number, input: PlayerInput, snapshotTick?: number): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || !this.hasSelectedCharacter) {
      return;
    }

    const message: InputMessage =
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

    this.send(toMiniClientMessage(message));
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
      this.options.onSnapshot(snapshot);
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
      return normalizeServerMessage(JSON.parse(data));
    } catch {
      return undefined;
    }
  }

  private send(message: unknown): void {
    this.socket?.send(JSON.stringify(message));
  }
}
