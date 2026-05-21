import { preloadAssets } from "../assets/assets.js";
import type { GameView, ViewKind } from "./types.js";

export async function createView(kind: ViewKind, root: HTMLElement): Promise<GameView> {
  showSplash(true);

  try {
    await preloadAssets(kind);
    return await createLoadedView(kind, root);
  } finally {
    showSplash(false);
  }
}

async function createLoadedView(kind: ViewKind, root: HTMLElement): Promise<GameView> {
  switch (kind) {
    case "canvas": {
      const { CanvasView } = await import("./canvas/CanvasView.js");
      return new CanvasView(root);
    }

    case "phaser": {
      const { PhaserView } = await import("./phaser/PhaserView.js");
      return new PhaserView(root);
    }

    case "three": {
      const { ThreeView } = await import("./three/ThreeView.js");
      return new ThreeView(root);
    }
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

  if (splash !== null) {
    splash.style.display = isShow ? "flex" : "none";
  }
}
