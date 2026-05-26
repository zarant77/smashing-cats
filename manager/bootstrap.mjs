import { defaultDevModules } from "./config.mjs";
import { getModuleChoices } from "./missions.mjs";
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
        runOneShotTask(payload.taskName);
        return;

      case "clean:target":
        cleanTarget(payload.targetName);
        return;

      case "clean:all":
        cleanAll();
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
  const modules = await askModules(ui, "Select web build modules");

  if (modules === null) {
    return;
  }

  setSelectedModules(modules);
  buildWeb(modules);
}

async function buildAndroidFlow(ui) {
  const modules = await askModules(ui, "Select Android build modules");

  if (modules === null) {
    return;
  }

  setSelectedModules(modules);
  buildAndroid(modules);
}

async function askModules(ui, title) {
  const selectedModules = getSelectedModules();

  return askModulesInTui(ui.screen, {
    title,
    choices: getModuleChoices(),
    selectedModules: selectedModules.length > 0 ? selectedModules : defaultDevModules,
  });
}
