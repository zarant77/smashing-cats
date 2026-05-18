import { ImageCache } from "../ImageCache.js";
import { IMAGE_ASSETS as canvas } from "./canvasManifest.js";
import { IMAGE_ASSETS as phaser } from "./phaserManifest.js";
import { IMAGE_ASSETS as three } from "./threeManifest.js";
import type { ViewKind } from "../views/types.js";

const manifestList = { canvas, phaser, three };

export const assets = new ImageCache();

export async function preloadAssets(engine: ViewKind): Promise<void> {
  await assets.preload(manifestList[engine]);
}
