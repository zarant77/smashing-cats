import { IMAGE_ASSETS } from "./assetManifest.js";
import { ImageCache } from "../ImageCache.js";

export const assets = new ImageCache();

export async function preloadAssets(): Promise<void> {
  await assets.preload(IMAGE_ASSETS);
}
