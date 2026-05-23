import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

export type ViewKind = "canvas" | "phaser" | "three";

export type GameView = {
  render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void;
  destroy: () => void;
};
