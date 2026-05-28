#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const allViews = ["canvas", "phaser", "three"];
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = join(scriptDir, "..");
const publicDir = join(appDir, "public");
const publicSrcDir = join(appDir, "public-src");
const enabledViews = parseEnabledViews(process.env.VITE_ENABLED_VIEWS ?? process.env.ENABLED_VIEWS);

rmSync(publicDir, {
  recursive: true,
  force: true,
});
mkdirSync(publicDir, {
  recursive: true,
});

copyPublicSource("common");

for (const sourceName of getRequiredAssetSources(enabledViews)) {
  copyPublicSource(sourceName);
}

console.log(`Prepared assets for views: ${enabledViews.join(", ")}`);

function parseEnabledViews(value) {
  if (value === undefined || value.trim() === "") {
    return allViews;
  }

  const parsedViews = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].filter((view) =>
    allViews.includes(view),
  );

  return parsedViews.length > 0 ? parsedViews : allViews;
}

function getRequiredAssetSources(views) {
  const assetSources = new Set();

  for (const view of views) {
    if (view === "phaser") {
      assetSources.add("canvas");
    }

    assetSources.add(view);
  }

  return assetSources;
}

function copyPublicSource(sourceName) {
  const sourcePath = join(publicSrcDir, sourceName);

  if (!existsSync(sourcePath)) {
    return;
  }

  cpSync(sourcePath, publicDir, {
    recursive: true,
    force: true,
  });
}
