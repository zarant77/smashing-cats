import { closeSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

import { devCommand, getClientViewsFromModules, getModuleEnv, getModuleLabel, getViewEnv, paths } from "./config.mjs";

import { clearDevSession, getDevSession, setDevSession } from "./stateStore.mjs";

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

export function getRunningDevSession() {
  const session = getDevSession();

  if (session === null) {
    return null;
  }

  if (!isProcessAlive(session.pid)) {
    clearDevSession();

    return null;
  }

  return session;
}

export function startDevSession(selectedModules) {
  const currentSession = getRunningDevSession();

  if (currentSession !== null) {
    throw new Error("Dev session already running");
  }

  const modulesLabel = getModuleLabel(selectedModules);
  const selectedViews = getClientViewsFromModules(selectedModules);
  const logPath = join(paths.logs, `dev-${modulesLabel}.log`);
  const logFd = openSync(logPath, "a");

  const child = spawn(devCommand.command, devCommand.args, {
    cwd: devCommand.cwd,
    detached: true,

    env: {
      ...process.env,
      ENABLED_MODULES: getModuleEnv(selectedModules),
      ENABLED_VIEWS: getViewEnv(selectedViews),
      VITE_ENABLED_VIEWS: getViewEnv(selectedViews),
    },

    stdio: ["ignore", logFd, logFd],
  });

  child.unref();
  closeSync(logFd);

  const devSession = {
    pid: child.pid,
    port: devCommand.port,
    modules: selectedModules,
    logPath,
    startedAt: new Date().toISOString(),
  };

  setDevSession(devSession);

  return devSession;
}

export function stopDevSession() {
  const session = getRunningDevSession();

  if (session === null) {
    return false;
  }

  try {
    process.kill(-session.pid, "SIGTERM");
  } catch {
    try {
      process.kill(session.pid, "SIGTERM");
    } catch {
      clearDevSession();

      return false;
    }
  }

  clearDevSession();

  return true;
}

export function restartDevSession(selectedModules) {
  stopDevSession();

  return startDevSession(selectedModules);
}

export function restoreDevSession() {
  return getRunningDevSession();
}

export function getDevStatusText() {
  const session = getRunningDevSession();

  if (session === null) {
    return "stopped";
  }

  return `running (${session.modules.join(", ")})`;
}
