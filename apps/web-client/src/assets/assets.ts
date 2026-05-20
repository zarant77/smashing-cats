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

let currentManifest: AssetManifest | undefined;

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
  return getAsset("images", key);
}

export function getAudioAsset(key: string): string {
  return getAsset("audio", key);
}

export function getModelAsset(key: string): string {
  return getAsset("models", key);
}

function getAsset(group: keyof AssetManifest, key: string): string {
  const manifest = currentManifest;

  if (manifest === undefined) {
    throw new Error("Asset manifest is not loaded.");
  }

  const assets = manifest[group] as Readonly<AssetMap> | undefined;

  if (assets === undefined) {
    return getAssetFromAnyManifest(group, key);
  }

  const asset = assets[key];

  if (asset !== undefined) {
    return asset;
  }

  return getAssetFromAnyManifest(group, key);
}

function getAssetFromAnyManifest(group: keyof AssetManifest, key: string): string {
  for (const manifest of Object.values(manifestList)) {
    const assets = manifest[group] as Readonly<AssetMap> | undefined;
    const asset = assets?.[key];

    if (asset !== undefined) {
      return asset;
    }
  }

  throw new Error(`Asset is not found: ${group}.${key}`);
}
