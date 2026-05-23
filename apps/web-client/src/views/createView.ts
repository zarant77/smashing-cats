import { preloadAssets } from "../assetManager/assetManager.js";
import { Uncrasher } from "../uncrasher.js";
import type { GameView, ViewKind } from "./types.js";

export async function createView(kind: ViewKind, root: HTMLElement): Promise<GameView> {
  updateSplash(true);

  try {
    await preloadAssets(kind, {
      onProgress: ({ percent }) => updateSplash(true, percent),
    });

    return await createLoadedView(kind, root);
  } catch (error) {
    Uncrasher.show(error);
    throw error;
  } finally {
    updateSplash(false);
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

let splash: HTMLDivElement | null = null;
let loadingText: HTMLDivElement | null = null;
let loadingProgressBar: HTMLDivElement | null = null;
let loadingProgressBarFill: HTMLDivElement | null = null;
let lastPercent: number | null = null;
let lastShow: boolean | null = null;

function updateSplash(isShow: boolean, percent?: number): void {
  if (!splash) {
    splash = document.getElementById("loading") as HTMLDivElement;
  }

  if (!loadingText) {
    loadingText = splash.querySelector(".loading-progress") as HTMLDivElement;
  }

  if (!loadingProgressBar) {
    loadingProgressBar = splash.querySelector(".loading-progress-bar") as HTMLDivElement;
  }

  if (!loadingProgressBarFill) {
    loadingProgressBarFill = splash.querySelector(".loading-progress-bar-fill") as HTMLDivElement;
  }

  if (isShow !== lastShow) {
    splash.style.display = isShow ? "flex" : "none";
    loadingText.hidden = !isShow;
    loadingProgressBar.hidden = !isShow;
    lastShow = isShow;
  }

  const normalizedPercent = Math.max(0, Math.min(100, percent ?? 0));

  if (normalizedPercent !== lastPercent) {
    loadingText.textContent = `${normalizedPercent}%`;
    loadingProgressBar.setAttribute("aria-valuenow", String(normalizedPercent));
    loadingProgressBarFill.style.width = `${normalizedPercent}%`;
    lastPercent = normalizedPercent;
  }
}
