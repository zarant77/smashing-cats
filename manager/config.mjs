import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = dirname(fileURLToPath(import.meta.url)).replace(/\/manager$/, "");

export const paths = {
  root: rootDir,
  web: join(rootDir, "apps/web-client"),
  android: join(rootDir, "apps/web-client/android"),
  build: join(rootDir, "build"),

  manager: join(rootDir, "manager"),
  state: join(rootDir, "manager/state.json"),
  logs: join(rootDir, "manager/logs"),
};

export const modules = {
  server: {
    title: "Server",
    flag: "--server",
  },

  canvas: {
    title: "Canvas",
    flag: "--canvas",
  },

  phaser: {
    title: "Phaser",
    flag: "--phaser",
  },

  three: {
    title: "Three.js",
    flag: "--three",
  },
};

export const defaultDevModules = ["server", "canvas"];

export const devCommand = {
  title: "Dev",
  command: "pnpm",
  args: ["dev"],
  cwd: paths.root,
  port: 8080,
  logFile: "dev.log",
};

export const buildWebCommand = {
  title: "Build Web",
  command: "pnpm",
  args: ["build:web"],
  cwd: paths.root,
};

export const buildAndroidCommand = {
  title: "Build Android",
  command: "pnpm",
  args: ["build:android"],
  cwd: paths.root,
};

export const oneShotTasks = {
  typecheck: {
    title: "Typecheck",
    command: "pnpm",
    args: ["typecheck"],
    cwd: paths.root,
  },
};

export const androidOutputs = {
  debugApk: {
    suffix: "debug.apk",
    source: "app/build/outputs/apk/debug/app-debug.apk",
  },

  releaseApk: {
    suffix: "release.apk",
    sources: [
      "app/build/outputs/apk/release/app-release.apk",
      "app/build/outputs/apk/release/app-release-unsigned.apk",
    ],
  },

  releaseAab: {
    suffix: "release.aab",
    source: "app/build/outputs/bundle/release/app-release.aab",
  },
};

export const cleanTargets = {
  build: {
    title: "Clean build/",
    paths: [paths.build],
  },

  managerLogs: {
    title: "Clean manager logs",
    paths: [paths.logs],
  },

  webDist: {
    title: "Clean web dist",
    paths: [join(paths.web, "dist")],
  },

  viteCache: {
    title: "Clean Vite cache",
    paths: [join(paths.web, "node_modules/.vite")],
  },

  androidBuild: {
    title: "Clean Android build",
    paths: [join(paths.android, "build"), join(paths.android, "app/build")],
  },
};

export function getModuleFlags(selectedModules) {
  return selectedModules.map((moduleName) => modules[moduleName]?.flag).filter(Boolean);
}

export function getModuleEnv(selectedModules) {
  return selectedModules.join(",");
}

export function getModuleLabel(selectedModules) {
  if (selectedModules.length === 0) {
    return "none";
  }

  return selectedModules.join("+");
}

export function getArtifactPrefix(selectedModules) {
  return `smashing-cats-${getModuleLabel(selectedModules)}`;
}
