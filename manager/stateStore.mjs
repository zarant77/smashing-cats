import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { defaultDevModules, paths } from "./config.mjs";

const defaultState = {
  devSession: null,

  lastBuild: null,

  selectedModules: defaultDevModules,

  ui: {
    selectedMenuPath: [],
  },
};

export function ensureManagerDirs() {
  mkdirSync(paths.manager, { recursive: true });
  mkdirSync(paths.logs, { recursive: true });
}

export function createDefaultState() {
  return structuredClone(defaultState);
}

export function readState() {
  ensureManagerDirs();

  if (!existsSync(paths.state)) {
    return createDefaultState();
  }

  try {
    const raw = readFileSync(paths.state, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...createDefaultState(),
      ...parsed,
      ui: {
        ...createDefaultState().ui,
        ...(parsed.ui ?? {}),
      },
    };
  } catch {
    return createDefaultState();
  }
}

export function writeState(state) {
  ensureManagerDirs();

  writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`);
}

export function updateState(updater) {
  const currentState = readState();
  const nextState = updater(currentState);

  writeState(nextState);

  return nextState;
}

export function resetState() {
  const state = createDefaultState();

  writeState(state);

  return state;
}

export function getDevSession() {
  return readState().devSession;
}

export function setDevSession(devSession) {
  return updateState((state) => ({
    ...state,
    devSession,
  }));
}

export function clearDevSession() {
  return setDevSession(null);
}

export function getSelectedModules() {
  return readState().selectedModules ?? defaultDevModules;
}

export function setSelectedModules(selectedModules) {
  return updateState((state) => ({
    ...state,
    selectedModules,
  }));
}

export function getLastBuild() {
  return readState().lastBuild;
}

export function setLastBuild(lastBuild) {
  return updateState((state) => ({
    ...state,
    lastBuild,
  }));
}

export function getUiState() {
  return readState().ui ?? {};
}

export function updateUiState(updater) {
  return updateState((state) => ({
    ...state,
    ui: updater(state.ui ?? {}),
  }));
}
