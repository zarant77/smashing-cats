import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import type { GameView, ViewOptions } from "../types.js";
import { BackgroundRenderer } from "./BackgroundRenderer.js";
import { EffectRenderer } from "./EffectRenderer.js";
import { EntityRenderer } from "./EntityRenderer.js";
import { FloatingTextRenderer } from "./FloatingTextRenderer.js";
import { GroundRenderer } from "./GroundRenderer.js";
import { ParticlesRenderer } from "./ParticlesRenderer.js";
import { PlayerRenderer } from "./PlayerRenderer.js";
import { ScreenShake } from "./ScreenShake.js";
import { createRenderViewport, resizeCanvasToRoot } from "./viewport.js";

export class CanvasView implements GameView {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  private readonly background = new BackgroundRenderer();
  private readonly ground = new GroundRenderer();
  private readonly particles = new ParticlesRenderer(10);
  private readonly effects = new EffectRenderer();

  private readonly entities: EntityRenderer;
  private readonly players: PlayerRenderer;

  private readonly screenShake = new ScreenShake();
  private readonly floatingTexts = new FloatingTextRenderer();

  private t: Translator = (key) => key;

  private lastFrameTime = performance.now();

  public constructor(
    private readonly root: HTMLElement,
    private readonly options: ViewOptions,
  ) {
    this.entities = new EntityRenderer(options.debug);
    this.players = new PlayerRenderer(options.debug);

    this.canvas = document.createElement("canvas");

    root.replaceChildren(this.canvas);

    resizeCanvasToRoot(this.canvas, this.root);

    const context = this.canvas.getContext("2d");

    if (context === null) {
      throw new Error("Canvas 2D context is unavailable");
    }

    this.context = context;
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    const ctx = this.context;

    resizeCanvasToRoot(this.canvas, this.root);

    const now = performance.now();
    const rawDelta = (now - this.lastFrameTime) / 1000;
    const deltaTime = Math.min(rawDelta, 0.033);

    this.lastFrameTime = now;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (snapshot === undefined) {
      ctx.fillStyle = "#87ceeb";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawCenteredText(this.t("connecting"));
      return;
    }

    const viewport = createRenderViewport(this.canvas, snapshot);

    this.screenShake.update(snapshot, playerId);
    this.floatingTexts.update(snapshot);

    this.background.draw(ctx, this.canvas, snapshot, viewport);

    const shake = this.screenShake.getOffset(viewport.scale);

    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.ground.draw(ctx, this.canvas, snapshot, viewport);
    this.particles.draw(ctx, this.canvas, deltaTime, viewport);

    for (const entity of snapshot.entities) {
      this.entities.draw(ctx, this.canvas.width, viewport, entity, this.effects);
    }

    for (const player of snapshot.players) {
      this.players.draw(ctx, this.canvas.width, viewport, snapshot, player, player.playerId === playerId, this.effects);
    }

    this.effects.draw(ctx, viewport);

    this.floatingTexts.draw(ctx, viewport);

    ctx.restore();
  }

  public setLocale(_locale: string, t: Translator): void {
    this.t = t;
  }

  private drawCenteredText(text: string): void {
    const ctx = this.context;

    ctx.fillStyle = "#111111";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

    ctx.textAlign = "start";
  }
}
