import type { GameSnapshot } from "@smashing-cats/protocol";

const BASE_CANVAS_WIDTH = 960;
const BASE_CANVAS_HEIGHT = 540;
const BASE_CANVAS_ASPECT = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;

export type ViewSize = {
  width: number;
  height: number;
  styleWidth: number;
  styleHeight: number;
};

export type RenderViewport = {
  scale: number;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  worldToScreenX: (x: number) => number;
  worldToScreenY: (y: number) => number;
  worldToScreenSize: (value: number) => number;
  screenToWorldX: (x: number) => number;
  screenToWorldY: (y: number) => number;
};

export function createRenderViewport(screenWidth: number, screenHeight: number, snapshot: GameSnapshot): RenderViewport {
  const scale = screenHeight / BASE_CANVAS_HEIGHT;

  return {
    scale,
    screenWidth,
    screenHeight,
    worldWidth: snapshot.world.width,
    worldHeight: snapshot.world.height,

    worldToScreenX: (x: number): number => {
      return (x - snapshot.world.scrollX) * scale;
    },

    worldToScreenY: (y: number): number => {
      return y * scale;
    },

    worldToScreenSize: (value: number): number => {
      return value * scale;
    },

    screenToWorldX: (x: number): number => {
      return x / scale + snapshot.world.scrollX;
    },

    screenToWorldY: (y: number): number => {
      return y / scale;
    },
  };
}

export function getViewSize(root: HTMLElement): ViewSize {
  const rootWidth = Math.max(1, root.clientWidth);
  const rootHeight = Math.max(1, root.clientHeight);
  const rootAspect = rootWidth / rootHeight;

  const width = rootAspect >= BASE_CANVAS_ASPECT ? Math.round(BASE_CANVAS_HEIGHT * rootAspect) : BASE_CANVAS_WIDTH;

  const height = rootAspect >= BASE_CANVAS_ASPECT ? BASE_CANVAS_HEIGHT : Math.round(BASE_CANVAS_WIDTH / rootAspect);

  return {
    width,
    height,
    styleWidth: rootWidth,
    styleHeight: rootHeight,
  };
}
