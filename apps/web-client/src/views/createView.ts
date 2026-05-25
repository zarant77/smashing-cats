import { preloadAssets } from "../assetManager/assetManager.js";
import { Uncrasher } from "../uncrasher.js";
import type { GameView, ViewKind } from "./types.js";

type RendererBundle = "canvas" | "all";

const rendererBundle = getRendererBundle();

export async function createView(kind: ViewKind, root: HTMLElement): Promise<GameView> {
  const safeKind = getAvailableViewKind(kind);

  updateSplash(true);

  try {
    await preloadAssets(safeKind, {
      onProgress: ({ percent }) => updateSplash(true, percent),
    });

    return await createLoadedView(safeKind, root);
  } catch (error) {
    Uncrasher.show(error);
    throw error;
  } finally {
    updateSplash(false);
  }
}

async function createLoadedView(kind: ViewKind, root: HTMLElement): Promise<GameView> {
  if (!isViewKindAvailable(kind)) {
    throw new Error(`View is not available in this build: ${kind}`);
  }

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
  const kind: ViewKind = value === "phaser" || value === "three" ? value : "canvas";

  return getAvailableViewKind(kind);
}

export function isViewKindAvailable(kind: ViewKind): boolean {
  if (rendererBundle === "all") {
    return true;
  }

  return kind === "canvas";
}

export function hasMultipleViewKinds(): boolean {
  return rendererBundle === "all";
}

function getAvailableViewKind(kind: ViewKind): ViewKind {
  if (isViewKindAvailable(kind)) {
    return kind;
  }

  return "canvas";
}

function getRendererBundle(): RendererBundle {
  const value = import.meta.env.VITE_RENDERER_BUNDLE;

  return value === "all" ? "all" : "canvas";
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
