import { AudioCache } from "./AudioCache.js";
import { ImageCache } from "./ImageCache.js";
import { ModelCache } from "./ModelCache.js";

import { IMAGES as canvasImages, AUDIO as canvasAudio, MODELS as canvasModels } from "./manifests/canvas.js";

import { IMAGES as phaserImages, AUDIO as phaserAudio, MODELS as phaserModels } from "./manifests/phaser.js";

import { IMAGES as threeImages, AUDIO as threeAudio, MODELS as threeModels } from "./manifests/three.js";

import type { ViewKind } from "../views/types.js";

export type AssetMap = Record<string, string>;

export type AssetManifest = {
  images?: AssetMap;
  audio?: AssetMap;
  models?: AssetMap;
};

const manifestList = {
  canvas: {
    images: canvasImages,
    audio: canvasAudio,
    models: canvasModels,
  },

  phaser: {
    images: phaserImages,
    audio: phaserAudio,
    models: phaserModels,
  },

  three: {
    images: threeImages,
    audio: threeAudio,
    models: threeModels,
  },
} satisfies Record<ViewKind, AssetManifest>;

export const images = new ImageCache();
export const audio = new AudioCache();
export const models = new ModelCache();

const DEFAULT_IMAGE_KEY = "default";

let currentManifest: AssetManifest | undefined;
const missingAssetWarnings = new Set<string>();

export async function preloadAssets(engine: ViewKind): Promise<void> {
  const manifest = manifestList[engine];

  currentManifest = manifest;

  const promises: Promise<void>[] = [];

  if (manifest.images !== undefined) {
    promises.push(images.preload(Object.values(manifest.images)));
  }

  if (manifest.audio !== undefined) {
    promises.push(audio.preload(Object.values(manifest.audio)));
  }

  if (manifest.models !== undefined) {
    promises.push(models.preload(Object.values(manifest.models)));
  }

  await Promise.all(promises);
}

export function getImageAsset(key: string): string {
  const asset = getAsset("images", key);

  if (asset !== undefined) {
    return asset;
  }

  warnMissingAsset("images", key, DEFAULT_IMAGE_KEY);

  const fallback = getAsset("images", DEFAULT_IMAGE_KEY);

  if (fallback === undefined) {
    throw new Error(`Default image asset is not found: images.${DEFAULT_IMAGE_KEY}`);
  }

  return fallback;
}

export function getAudioAsset(key: string): string {
  const asset = getAsset("audio", key);

  if (asset === undefined) {
    throw new Error(`Asset is not found: audio.${key}`);
  }

  return asset;
}

export function getModelAsset(key: string): string {
  const asset = getAsset("models", key);

  if (asset === undefined) {
    throw new Error(`Asset is not found: models.${key}`);
  }

  return asset;
}

function getAsset(group: keyof AssetManifest, key: string): string | undefined {
  const manifest = currentManifest;

  if (manifest === undefined) {
    throw new Error("Asset manifest is not loaded.");
  }

  const assets = manifest[group] as Readonly<AssetMap> | undefined;

  if (assets === undefined) {
    return findAssetInAnyManifest(group, key);
  }

  const asset = assets[key];

  if (asset !== undefined) {
    return asset;
  }

  return findAssetInAnyManifest(group, key);
}

function findAssetInAnyManifest(group: keyof AssetManifest, key: string): string | undefined {
  for (const manifest of Object.values(manifestList)) {
    const assets = manifest[group] as Readonly<AssetMap> | undefined;
    const asset = assets?.[key];

    if (asset !== undefined) {
      return asset;
    }
  }

  return undefined;
}

function warnMissingAsset(group: keyof AssetManifest, key: string, fallbackKey: string): void {
  const warningKey = `${group}.${key}`;

  if (missingAssetWarnings.has(warningKey)) {
    return;
  }

  missingAssetWarnings.add(warningKey);
  console.warn(`Asset is not found: ${warningKey}. Using ${group}.${fallbackKey}.`);
}
