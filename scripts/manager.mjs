#!/usr/bin/env node

import { checkbox } from "@inquirer/prompts";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const webDir = join(rootDir, "apps/web-client");
const androidDir = join(webDir, "android");
const buildDir = join(rootDir, "build");

const tasks = await checkbox({
  message: "Що збираємо, котику?",
  choices: [
    { name: "Typecheck", value: "typecheck" },

    { name: "Dev: canvas", value: "dev:lite" },
    { name: "Dev: phaser", value: "dev:phaser" },
    { name: "Dev: full", value: "dev:experimental" },

    { name: "Build web: canvas", value: "build:web:lite" },
    { name: "Build web: phaser", value: "build:web:phaser" },
    { name: "Build web: full", value: "build:web:experimental" },

    { name: "Android: canvas APK + AAB", value: "android:canvas" },
    { name: "Android: phaser APK + AAB", value: "android:phaser" },
    { name: "Android: full APK + AAB", value: "android:full" },
  ],
});

for (const task of tasks) {
  runTask(task);
}

function runTask(task) {
  switch (task) {
    case "typecheck":
      run("pnpm", ["typecheck"]);
      return;

    case "android:canvas":
      buildAndroid("canvas", "build:android:canvas");
      return;

    case "android:phaser":
      buildAndroid("phaser", "build:android:phaser");
      return;

    case "android:full":
      buildAndroid("full", "build:android:full");
      return;

    default:
      run("pnpm", [task]);
  }
}

function buildAndroid(flavor, buildCommand) {
  mkdirSync(buildDir, { recursive: true });

  run("npx", ["capacitor-assets", "generate"], { cwd: webDir });

  run(
    "find",
    [
      "android/app/src/main/res",
      "-type",
      "f",
      "-name",
      "splash.png",
      "!",
      "-path",
      "android/app/src/main/res/drawable/splash.png",
      "-delete",
    ],
    { cwd: webDir },
  );

  run("pnpm", [buildCommand], { cwd: rootDir });

  run("./gradlew", ["clean"], { cwd: androidDir });
  run("./gradlew", ["assembleDebug", "assembleRelease", "bundleRelease"], {
    cwd: androidDir,
  });

  copyBuild(flavor, "debug.apk", "app/build/outputs/apk/debug/app-debug.apk");

  copyFirstExistingBuild(flavor, "release.apk", [
    "app/build/outputs/apk/release/app-release.apk",
    "app/build/outputs/apk/release/app-release-unsigned.apk",
  ]);

  copyBuild(flavor, "release.aab", "app/build/outputs/bundle/release/app-release.aab");
}

function copyBuild(flavor, suffix, source) {
  const sourcePath = join(androidDir, source);

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️ Build not found: ${source}`);
    return;
  }

  copyBuildFile(flavor, suffix, sourcePath);
}

function copyFirstExistingBuild(flavor, suffix, sources) {
  for (const source of sources) {
    const sourcePath = join(androidDir, source);

    if (!existsSync(sourcePath)) {
      continue;
    }

    copyBuildFile(flavor, suffix, sourcePath);
    return;
  }

  console.warn(`⚠️ Build not found: ${suffix}`);
}

function copyBuildFile(flavor, suffix, sourcePath) {
  const targetPath = join(buildDir, `smashing-cats-${flavor}-${suffix}`);

  rmSync(targetPath, { force: true });
  copyFileSync(sourcePath, targetPath);

  console.log(`✅ ${targetPath}`);
}

function run(command, args, options = {}) {
  const cwd = options.cwd ?? rootDir;
  const fullCommand = [command, ...args].join(" ");

  console.log(`\n> ${fullCommand}\n`);

  const result = spawnSync(fullCommand, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
