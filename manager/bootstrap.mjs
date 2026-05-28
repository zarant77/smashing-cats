import { defaultBuildViews, defaultDevModules } from "./config.mjs";
import { getBuildViewChoices, getModuleChoices } from "./missions.mjs";
import { askModulesInTui } from "./modulePicker.mjs";
import { createTui } from "./tui.mjs";

import { restartDevSession, startDevSession, stopDevSession } from "./processRegistry.mjs";

import { buildAndroid, buildWeb, cleanAll, cleanTarget, runOneShotTask } from "./taskRunner.mjs";

import { getSelectedModules, setSelectedModules } from "./stateStore.mjs";

export async function bootstrapManager() {
  let ui;

  async function handleAction(action, payload = {}) {
    switch (action) {
      case "dev:start":
        await startDevFlow(ui);
        return;

      case "dev:restart":
        await restartDevFlow(ui);
        return;

      case "dev:stop":
        stopDevSession();
        return;

      case "build:web":
        await buildWebFlow(ui);
        return;

      case "build:android":
        await buildAndroidFlow(ui);
        return;

      case "task:run":
        await runOneShotTask(payload.taskName, {
          onLog: ui.appendLog,
        });
        return;

      case "clean:target":
        await cleanTarget(payload.targetName, {
          onLog: ui.appendLog,
        });
        return;

      case "clean:all":
        await cleanAll({
          onLog: ui.appendLog,
        });
        return;

      case "exit":
        process.exit(0);
        return;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  ui = createTui({
    onAction: handleAction,
  });
}

async function startDevFlow(ui) {
  const modules = await askModules(ui, "Select dev modules");

  if (modules === null) {
    return;
  }

  setSelectedModules(modules);
  startDevSession(modules);
}

async function restartDevFlow(ui) {
  const modules = await askModules(ui, "Select dev modules");

  if (modules === null) {
    return;
  }

  setSelectedModules(modules);
  restartDevSession(modules);
}

async function buildWebFlow(ui) {
  const views = await askBuildViews(ui, "Select web build views");

  if (views === null) {
    return;
  }

  await buildWeb(views, {
    onLog: ui.appendLog,
  });
}

async function buildAndroidFlow(ui) {
  const views = await askBuildViews(ui, "Select Android build views");

  if (views === null) {
    return;
  }

  await buildAndroid(views, {
    onLog: ui.appendLog,
  });
}

async function askModules(ui, title) {
  const selectedModules = getSelectedModules();

  return askModulesInTui(ui.screen, {
    title,
    choices: getModuleChoices(),
    selectedModules: selectedModules.length > 0 ? selectedModules : defaultDevModules,
  });
}

async function askBuildViews(ui, title) {
  return askModulesInTui(ui.screen, {
    title,
    choices: getBuildViewChoices(),
    selectedModules: defaultBuildViews,
  });
}
