import type { ViewKind } from "./types.js";

export const ALL_VIEW_KINDS = ["canvas", "phaser", "three"] as const satisfies readonly ViewKind[];

export const enabledViewKinds = parseEnabledViewKinds(import.meta.env.VITE_ENABLED_VIEWS);

export function isViewKindEnabled(kind: ViewKind): boolean {
  return enabledViewKinds.includes(kind);
}

export function getFirstEnabledViewKind(): ViewKind {
  return enabledViewKinds[0];
}

export function hasMultipleEnabledViewKinds(): boolean {
  return enabledViewKinds.length > 1;
}

export function parseEnabledViewKinds(value: string | undefined): ViewKind[] {
  if (value === undefined || value.trim() === "") {
    return [...ALL_VIEW_KINDS];
  }

  const enabledViews = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].filter(
    isKnownViewKind,
  );

  return enabledViews.length > 0 ? enabledViews : [...ALL_VIEW_KINDS];
}

function isKnownViewKind(value: string): value is ViewKind {
  return ALL_VIEW_KINDS.includes(value as ViewKind);
}
