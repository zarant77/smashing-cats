import { preloadAssets } from "../assets/assets.js";
import type { GameView, ViewKind, ViewOptions } from "./types.js";

export async function createView(kind: ViewKind, root: HTMLElement, options: ViewOptions): Promise<GameView> {
  showSplash(true);

  try {
    await preloadAssets(kind);
    return await createLoadedView(kind, root, options);
  } finally {
    showSplash(false);
  }
}

async function createLoadedView(kind: ViewKind, root: HTMLElement, options: ViewOptions): Promise<GameView> {
  switch (kind) {
    case "canvas": {
      showUderConstruction(false);
      const { CanvasView } = await import("./canvas/CanvasView.js");
      return new CanvasView(root, options);
    }

    case "phaser": {
      showUderConstruction(true);
      const { PhaserView } = await import("./phaser/PhaserView.js");
      return new PhaserView(root, options);
    }

    case "three": {
      showUderConstruction(true);
      const { ThreeView } = await import("./three/ThreeView.js");
      return new ThreeView(root, options);
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

function showUderConstruction(isShow: boolean) {
  const underConstruction = document.getElementById("under-construction");

  if (underConstruction) {
    underConstruction.style.display = isShow ? "block" : "none";
  }
}
