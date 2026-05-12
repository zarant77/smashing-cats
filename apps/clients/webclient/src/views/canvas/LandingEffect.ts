const LANDING_EFFECT_MS = 200;
const LANDING_EFFECT_PATH = "/effects/smash.png";
const OFFSET_X = 40;
const OFFSET_Y = -20;
const WIDTH = 64 * 3;
const HEIGHT = 23 * 3;

type LandingEffectState = {
  wasGrounded: boolean;
  effectStartedAt: number;
  x: number;
  y: number;
};

export class LandingEffect {
  private readonly states = new Map<string, LandingEffectState>();

  public update(input: { id: string; x: number; y: number; width: number; height: number; grounded: boolean }): void {
    const state = this.getState(input);

    if (!state.wasGrounded && input.grounded) {
      state.effectStartedAt = performance.now();
      state.x = input.x + input.width / 2 + OFFSET_X;
      state.y = input.y + input.height + OFFSET_Y;
    }

    state.wasGrounded = input.grounded;
  }

  public draw(ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: string): void {
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
    const scale = 1 + progress * 0.35;

    const width = WIDTH * scale;
    const height = HEIGHT * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, state.x - width / 2, state.y - height / 2, width, height);
    ctx.restore();
  }

  public getImagePath(): string {
    return LANDING_EFFECT_PATH;
  }

  private getState(input: { id: string; x: number; y: number; width: number; height: number; grounded: boolean }): LandingEffectState {
    const existing = this.states.get(input.id);

    if (existing) {
      return existing;
    }

    const state: LandingEffectState = {
      wasGrounded: input.grounded,
      effectStartedAt: -Infinity,
      x: input.x + input.width / 2 + OFFSET_X,
      y: input.y + input.height + OFFSET_Y,
    };

    this.states.set(input.id, state);
    return state;
  }
}
