const BASE_CANVAS_WIDTH = 960;
const BASE_CANVAS_HEIGHT = 540;
const BASE_CANVAS_ASPECT = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;

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
