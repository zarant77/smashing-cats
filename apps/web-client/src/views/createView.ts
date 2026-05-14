import { CanvasView } from "./canvas/CanvasView.js";
import { PhaserView } from "./phaser/PhaserView.js";
import { ThreeView } from "./three/ThreeView.js";
import type { GameView, ViewKind } from "./types.js";

export function createView(kind: ViewKind, root: HTMLElement): GameView {
  switch (kind) {
    case "canvas":
      return new CanvasView(root);
    case "phaser":
      return new PhaserView(root);
    case "three":
      return new ThreeView(root);
  }
}

export function parseViewKind(value: string | null): ViewKind {
  switch (value) {
    case "phaser":
    case "three":
      return value;
    default:
      return "canvas";
  }
}
