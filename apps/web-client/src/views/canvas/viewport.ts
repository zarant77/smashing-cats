import type { GameSnapshot } from "@smashing-cats/protocol";

const BASE_CANVAS_WIDTH = 960;
const BASE_CANVAS_HEIGHT = 540;
const BASE_CANVAS_ASPECT = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;

export type RenderViewport = {
  scale: number;
  worldToScreenX: (x: number) => number;
  worldToScreenY: (y: number) => number;
  worldToScreenSize: (value: number) => number;
};

export function resizeCanvasToRoot(canvas: HTMLCanvasElement, root: HTMLElement): void {
  const rootWidth = Math.max(1, root.clientWidth);
  const rootHeight = Math.max(1, root.clientHeight);
  const rootAspect = rootWidth / rootHeight;

  const nextWidth = rootAspect >= BASE_CANVAS_ASPECT ? Math.round(BASE_CANVAS_HEIGHT * rootAspect) : BASE_CANVAS_WIDTH;
  const nextHeight = rootAspect >= BASE_CANVAS_ASPECT ? BASE_CANVAS_HEIGHT : Math.round(BASE_CANVAS_WIDTH / rootAspect);

  if (canvas.width !== nextWidth) {
    canvas.width = nextWidth;
  }

  if (canvas.height !== nextHeight) {
    canvas.height = nextHeight;
  }
}

export function createRenderViewport(canvas: HTMLCanvasElement, snapshot: GameSnapshot): RenderViewport {
  const scale = canvas.height / BASE_CANVAS_HEIGHT;

  return {
    scale,

    worldToScreenX: (x) => (x - snapshot.world.scrollX) * scale,

    worldToScreenY: (y) => y * scale,

    worldToScreenSize: (value) => value * scale,
  };
}
