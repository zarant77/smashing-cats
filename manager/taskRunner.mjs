import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import {
  androidOutputs,
  buildAndroidCommand,
  buildWebCommand,
  cleanTargets,
  getArtifactPrefix,
  getModuleEnv,
  oneShotTasks,
  paths,
} from "./config.mjs";

import { setLastBuild } from "./stateStore.mjs";

export function runOneShotTask(taskName) {
  const task = oneShotTasks[taskName];

  if (task === undefined) {
    throw new Error(`Unknown task: ${taskName}`);
  }

  return runCommand(task.command, task.args, {
    cwd: task.cwd,
    title: task.title,
  });
}

export function buildWeb(selectedModules) {
  const result = runCommand(buildWebCommand.command, buildWebCommand.args, {
    cwd: buildWebCommand.cwd,
    title: buildWebCommand.title,
    env: {
      ENABLED_MODULES: getModuleEnv(selectedModules),
    },
  });

  setLastBuild({
    type: "web",
    modules: selectedModules,
    success: result.success,
    finishedAt: new Date().toISOString(),
  });

  return result;
}

export function buildAndroid(selectedModules) {
  mkdirSync(paths.build, { recursive: true });

  runCommand("npx", ["capacitor-assets", "generate"], {
    cwd: paths.web,
    title: "Generate Capacitor assets",
  });

  runCommand(
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
    {
      cwd: paths.web,
      title: "Remove duplicate splash images",
    },
  );

  runCommand(buildAndroidCommand.command, buildAndroidCommand.args, {
    cwd: buildAndroidCommand.cwd,
    title: buildAndroidCommand.title,
    env: {
      ENABLED_MODULES: getModuleEnv(selectedModules),
    },
  });

  runCommand("./gradlew", ["clean"], {
    cwd: paths.android,
    title: "Gradle clean",
  });

  runCommand("./gradlew", ["assembleDebug", "assembleRelease", "bundleRelease"], {
    cwd: paths.android,
    title: "Gradle Android build",
  });

  copyAndroidArtifacts(selectedModules);

  setLastBuild({
    type: "android",
    modules: selectedModules,
    success: true,
    finishedAt: new Date().toISOString(),
  });

  return {
    success: true,
  };
}

export function cleanTarget(targetName) {
  const target = cleanTargets[targetName];

  if (target === undefined) {
    throw new Error(`Unknown clean target: ${targetName}`);
  }

  for (const targetPath of target.paths) {
    rmSync(targetPath, {
      recursive: true,
      force: true,
    });

    console.log(`Removed ${targetPath}`);
  }
}

export function cleanAll() {
  for (const targetName of Object.keys(cleanTargets)) {
    cleanTarget(targetName);
  }
}

function copyAndroidArtifacts(selectedModules) {
  copyAndroidArtifact(selectedModules, androidOutputs.debugApk);
  copyFirstExistingAndroidArtifact(selectedModules, androidOutputs.releaseApk);
  copyAndroidArtifact(selectedModules, androidOutputs.releaseAab);
}

function copyAndroidArtifact(selectedModules, output) {
  const sourcePath = join(paths.android, output.source);

  if (!existsSync(sourcePath)) {
    console.warn(`Build not found: ${output.source}`);
    return;
  }

  copyArtifactFile(selectedModules, output.suffix, sourcePath);
}

function copyFirstExistingAndroidArtifact(selectedModules, output) {
  for (const source of output.sources) {
    const sourcePath = join(paths.android, source);

    if (!existsSync(sourcePath)) {
      continue;
    }

    copyArtifactFile(selectedModules, output.suffix, sourcePath);
    return;
  }

  console.warn(`Build not found: ${output.suffix}`);
}

function copyArtifactFile(selectedModules, suffix, sourcePath) {
  const targetPath = join(paths.build, `${getArtifactPrefix(selectedModules)}-${suffix}`);

  rmSync(targetPath, { force: true });
  copyFileSync(sourcePath, targetPath);

  console.log(`Copied ${targetPath}`);
}

function runCommand(command, args, options = {}) {
  const cwd = options.cwd ?? paths.root;

  const env = {
    ...process.env,
    ...(options.env ?? {}),
  };

  console.log(`\n${options.title ?? command}`);
  console.log(`> ${[command, ...args].join(" ")}\n`);

  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
  }

  return {
    success: true,
    status: result.status,
  };
}
