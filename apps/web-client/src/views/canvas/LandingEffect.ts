import { assets } from "../../assets/assets.js";
import type { RenderViewport } from "./viewport.js";

const LANDING_EFFECT_MS = 200;
const LANDING_EFFECT_PATH = "/effects/smash.png";
const OFFSET_X = 20;
const OFFSET_Y = -20;
const WIDTH = 64 * 3;
const HEIGHT = 23 * 3;

type LandingEffectState = {
  wasGrounded: boolean;
  wasSmashing: boolean;
  effectStartedAt: number;
  x: number;
  y: number;
};

type LandingEffectInput = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  grounded: boolean;
  smashing: boolean;
};

export class LandingEffect {
  private readonly states = new Map<string, LandingEffectState>();

  public update(input: LandingEffectInput): void {
    const state = this.getState(input);

    const justLanded = !state.wasGrounded && input.grounded;

    if (justLanded && state.wasSmashing) {
      state.effectStartedAt = performance.now();
      state.x = input.x + input.width / 2 + OFFSET_X;
      state.y = input.y + input.height + OFFSET_Y;
    }

    state.wasGrounded = input.grounded;
    state.wasSmashing = input.smashing || (!input.grounded && state.wasSmashing);
  }

  public draw(ctx: CanvasRenderingContext2D, viewport: RenderViewport, id: string): void {
    const image = assets.get(LANDING_EFFECT_PATH);

    if (!image.complete || image.naturalWidth <= 0) {
      return;
    }

    const state = this.states.get(id);

    if (!state) {
      return;
    }

    const elapsed = performance.now() - state.effectStartedAt;

    if (elapsed < 0 || elapsed > LANDING_EFFECT_MS) {
      return;
    }

    const progress = elapsed / LANDING_EFFECT_MS;
    const alpha = 1 - progress;
    const effectScale = 1 + progress * 0.35;

    const width = viewport.worldToScreenSize(WIDTH * effectScale);
    const height = viewport.worldToScreenSize(HEIGHT * effectScale);
    const x = viewport.worldToScreenX(state.x);
    const y = viewport.worldToScreenY(state.y);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  }

  public getImagePath(): string {
    return LANDING_EFFECT_PATH;
  }

  private getState(input: LandingEffectInput): LandingEffectState {
    const existing = this.states.get(input.id);

    if (existing) {
      return existing;
    }

    const state: LandingEffectState = {
      wasGrounded: input.grounded,
      wasSmashing: input.smashing,
      effectStartedAt: -Infinity,
      x: input.x + input.width / 2 + OFFSET_X,
      y: input.y + input.height + OFFSET_Y,
    };

    this.states.set(input.id, state);

    return state;
  }
}
