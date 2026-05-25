import { AudioCache } from "./AudioCache.js";
import { ImageCache } from "./ImageCache.js";
import { ModelCache } from "./ModelCache.js";

import type { ViewKind } from "../views/types.js";

export type AssetMap = Record<string, string>;

export type AssetManifest = {
  images?: AssetMap;
  audio?: AssetMap;
  models?: AssetMap;
};

export type AssetLoadProgress = {
  loaded: number;
  total: number;
  percent: number;
  group: keyof AssetManifest;
  path: string;
};

export type PreloadAssetsOptions = {
  onProgress?: (progress: AssetLoadProgress) => void;
};

type AssetEntry = {
  group: keyof AssetManifest;
  path: string;
};

type LoadedManifests = Partial<Record<ViewKind, AssetManifest>>;

export const images = new ImageCache();
export const audio = new AudioCache();
export const models = new ModelCache();

const DEFAULT_IMAGE_KEY = "default";

let currentManifest: AssetManifest | undefined;
const loadedManifests: LoadedManifests = {};
const missingAssetWarnings = new Set<string>();

export async function preloadAssets(engine: ViewKind, options: PreloadAssetsOptions = {}): Promise<void> {
  const manifest = await loadManifest(engine);

  currentManifest = manifest;

  const entries = [
    ...getAssetEntries("images", manifest.images),
    ...getAssetEntries("audio", manifest.audio),
    ...getAssetEntries("models", manifest.models),
  ];

  let loaded = 0;
  const total = entries.length;

  if (total === 0) {
    options.onProgress?.({
      loaded: 0,
      total: 0,
      percent: 100,
      group: "images",
      path: "",
    });

    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      await preloadSingleAsset(entry);

      loaded += 1;

      options.onProgress?.({
        loaded,
        total,
        percent: Math.round((loaded / total) * 100),
        group: entry.group,
        path: entry.path,
      });
    }),
  );
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

async function loadManifest(engine: ViewKind): Promise<AssetManifest> {
  const loadedManifest = loadedManifests[engine];

  if (loadedManifest !== undefined) {
    return loadedManifest;
  }

  const manifest = await importManifest(engine);
  loadedManifests[engine] = manifest;

  return manifest;
}

async function importManifest(engine: ViewKind): Promise<AssetManifest> {
  switch (engine) {
    case "canvas": {
      const { IMAGES, AUDIO, MODELS } = await import("./manifests/canvas.js");

      return {
        images: IMAGES,
        audio: AUDIO,
        models: MODELS,
      };
    }

    case "phaser": {
      const { IMAGES, AUDIO, MODELS } = await import("./manifests/phaser.js");

      return {
        images: IMAGES,
        audio: AUDIO,
        models: MODELS,
      };
    }

    case "three": {
      const { IMAGES, AUDIO, MODELS } = await import("./manifests/three.js");

      return {
        images: IMAGES,
        audio: AUDIO,
        models: MODELS,
      };
    }
  }
}

function getAsset(group: keyof AssetManifest, key: string): string | undefined {
  const manifest = currentManifest;

  if (manifest === undefined) {
    throw new Error("Asset manifest is not loaded.");
  }

  const assets = manifest[group] as Readonly<AssetMap> | undefined;

  if (assets === undefined) {
    return undefined;
  }

  return assets[key];
}

function getAssetEntries(group: keyof AssetManifest, assets: AssetMap | undefined): AssetEntry[] {
  if (assets === undefined) {
    return [];
  }

  return Object.values(assets).map((path) => ({
    group,
    path,
  }));
}

function preloadSingleAsset(entry: AssetEntry): Promise<void> {
  if (entry.group === "images") {
    return images.preload([entry.path]);
  }

  if (entry.group === "audio") {
    return audio.preload([entry.path]);
  }

  if (entry.group === "models") {
    return models.preload([entry.path]);
  }

  return Promise.resolve();
}

function warnMissingAsset(group: keyof AssetManifest, key: string, fallbackKey: string): void {
  const warningKey = `${group}.${key}`;

  if (missingAssetWarnings.has(warningKey)) {
    return;
  }

  missingAssetWarnings.add(warningKey);
  console.warn(`Asset is not found: ${warningKey}. Using ${group}.${fallbackKey}.`);
}
