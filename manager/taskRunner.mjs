import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

import {
  androidOutputs,
  buildAndroidCommand,
  buildWebCommand,
  cleanTargets,
  getArtifactPrefix,
  getClientViewsFromModules,
  getViewEnv,
  oneShotTasks,
  paths,
} from "./config.mjs";

import { setLastBuild } from "./stateStore.mjs";

export async function runOneShotTask(taskName, options = {}) {
  const task = oneShotTasks[taskName];

  if (task === undefined) {
    throw new Error(`Unknown task: ${taskName}`);
  }

  return runCommand(task.command, task.args, {
    cwd: task.cwd,
    title: task.title,
    onLog: options.onLog,
  });
}

export async function buildWeb(selectedViews, options = {}) {
  const clientViews = getClientViewsFromModules(selectedViews);

  if (clientViews.length === 0) {
    throw new Error("Select at least one client view to build.");
  }

  const enabledViews = getViewEnv(clientViews);
  const result = await runCommand(buildWebCommand.command, buildWebCommand.args, {
    cwd: buildWebCommand.cwd,
    title: buildWebCommand.title,
    onLog: options.onLog,
    env: {
      ENABLED_VIEWS: enabledViews,
      VITE_ENABLED_VIEWS: enabledViews,
    },
  });

  setLastBuild({
    type: "web",
    modules: clientViews,
    success: result.success,
    finishedAt: new Date().toISOString(),
  });

  return result;
}

export async function buildAndroid(selectedViews, options = {}) {
  const onLog = options.onLog;
  const clientViews = getClientViewsFromModules(selectedViews);

  if (clientViews.length === 0) {
    throw new Error("Select at least one client view to build.");
  }

  const enabledViews = getViewEnv(clientViews);

  mkdirSync(paths.build, { recursive: true });

  await runCommand("npx", ["capacitor-assets", "generate"], {
    cwd: paths.web,
    title: "Generate Capacitor assets",
    onLog,
  });

  await runCommand(
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
      onLog,
    },
  );

  await runCommand(buildAndroidCommand.command, buildAndroidCommand.args, {
    cwd: buildAndroidCommand.cwd,
    title: buildAndroidCommand.title,
    onLog,
    env: {
      ENABLED_VIEWS: enabledViews,
      VITE_ENABLED_VIEWS: enabledViews,
    },
  });

  await runCommand("./gradlew", ["clean"], {
    cwd: paths.android,
    title: "Gradle clean",
    onLog,
  });

  await runCommand("./gradlew", ["assembleDebug", "assembleRelease", "bundleRelease"], {
    cwd: paths.android,
    title: "Gradle Android build",
    onLog,
  });

  copyAndroidArtifacts(clientViews, onLog);

  setLastBuild({
    type: "android",
    modules: clientViews,
    success: true,
    finishedAt: new Date().toISOString(),
  });

  return {
    success: true,
  };
}

export async function cleanTarget(targetName, options = {}) {
  const target = cleanTargets[targetName];

  if (target === undefined) {
    throw new Error(`Unknown clean target: ${targetName}`);
  }

  for (const targetPath of target.paths) {
    rmSync(targetPath, {
      recursive: true,
      force: true,
    });

    writeLog(options.onLog, `Removed ${targetPath}\n`);
  }
}

export async function cleanAll(options = {}) {
  for (const targetName of Object.keys(cleanTargets)) {
    await cleanTarget(targetName, options);
  }
}

function copyAndroidArtifacts(selectedModules, onLog) {
  copyAndroidArtifact(selectedModules, androidOutputs.debugApk, onLog);
  copyFirstExistingAndroidArtifact(selectedModules, androidOutputs.releaseApk, onLog);
  copyAndroidArtifact(selectedModules, androidOutputs.releaseAab, onLog);
}

function copyAndroidArtifact(selectedModules, output, onLog) {
  const sourcePath = join(paths.android, output.source);

  if (!existsSync(sourcePath)) {
    writeLog(onLog, `Build not found: ${output.source}\n`);
    return;
  }

  copyArtifactFile(selectedModules, output.suffix, sourcePath, onLog);
}

function copyFirstExistingAndroidArtifact(selectedModules, output, onLog) {
  for (const source of output.sources) {
    const sourcePath = join(paths.android, source);

    if (!existsSync(sourcePath)) {
      continue;
    }

    copyArtifactFile(selectedModules, output.suffix, sourcePath, onLog);
    return;
  }

  writeLog(onLog, `Build not found: ${output.suffix}\n`);
}

function copyArtifactFile(selectedModules, suffix, sourcePath, onLog) {
  const targetPath = join(paths.build, `${getArtifactPrefix(selectedModules)}-${suffix}`);

  rmSync(targetPath, { force: true });
  copyFileSync(sourcePath, targetPath);

  writeLog(onLog, `Copied ${targetPath}\n`);
}

function runCommand(command, args, options = {}) {
  const cwd = options.cwd ?? paths.root;

  const env = {
    ...process.env,
    ...(options.env ?? {}),
  };

  const commandText = [command, ...args].join(" ");

  writeLog(options.onLog, `\n${options.title ?? command}\n`);
  writeLog(options.onLog, `> ${commandText}\n\n`);

  return new Promise((resolve, reject) => {
    let settled = false;

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      writeLog(options.onLog, chunk);
    });

    child.stderr.on("data", (chunk) => {
      writeLog(options.onLog, chunk);
    });

    child.on("error", (error) => {
      settled = true;
      reject(error);
    });

    child.on("close", (status) => {
      if (settled) {
        return;
      }

      settled = true;

      if (status !== 0) {
        reject(new Error(`Command failed: ${commandText}`));
        return;
      }

      resolve({
        success: true,
        status,
      });
    });
  });
}

function writeLog(onLog, text) {
  if (typeof onLog === "function") {
    onLog(text);
  }
}
