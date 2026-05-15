import { CanvasView } from "./canvas/CanvasView.js";
import { PhaserView } from "./phaser/PhaserView.js";
import { ThreeView } from "./three/ThreeView.js";
import type { GameView, ViewKind, ViewOptions } from "./types.js";

export function createView(kind: ViewKind, root: HTMLElement, options: ViewOptions): GameView {
  switch (kind) {
    case "canvas":
      return new CanvasView(root, options);

    case "phaser":
      return new PhaserView(root, options);

    case "three":
      return new ThreeView(root, options);
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
