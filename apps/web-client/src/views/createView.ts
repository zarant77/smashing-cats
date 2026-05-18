import { preloadAssets } from "../assets/assets.js";
import { CanvasView } from "./canvas/CanvasView.js";
import { PhaserView } from "./phaser/PhaserView.js";
import { ThreeView } from "./three/ThreeView.js";
import type { GameView, ViewKind, ViewOptions } from "./types.js";

const ViewList = {
  canvas: CanvasView,
  phaser: PhaserView,
  three: ThreeView,
};

export async function createView(kind: ViewKind, root: HTMLElement, options: ViewOptions): Promise<GameView> {
  showSplash(true);

  const View = ViewList[kind];

  try {
    await preloadAssets(kind);
    return new View(root, options);
  } finally {
    showSplash(false);
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

function showSplash(isShow: boolean): void {
  const splash = document.getElementById("loading");

  if (splash) {
    splash.style.display = isShow ? "flex" : "none";
  }
}
