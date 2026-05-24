import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { GameView } from "../types.js";
import { AudioEventPlayer } from "./AudioEventPlayer.js";
import { BackgroundRenderer } from "./BackgroundRenderer.js";
import { ForegroundRenderer } from "./ForegroundRenderer.js";
import { EffectRenderer } from "./EffectRenderer.js";
import { EntityRenderer } from "./EntityRenderer.js";
import { FloatingTextRenderer } from "./FloatingTextRenderer.js";
import { GroundRenderer } from "./GroundRenderer.js";
import { ParticlesRenderer } from "./ParticlesRenderer.js";
import { PlayerRenderer } from "./PlayerRenderer.js";
import { ScreenShake } from "./ScreenShake.js";
import { TutorialRenderer } from "./TutorialRenderer.js";
import { createRenderViewport, getViewSize } from "../viewport.js";
import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";

export class CanvasView implements GameView {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  private readonly audioEventPlayer = new AudioEventPlayer();
  private readonly background = new BackgroundRenderer();
  private readonly foreground = new ForegroundRenderer();
  private readonly ground = new GroundRenderer();
  private readonly particles = new ParticlesRenderer(10);
  private readonly effects = new EffectRenderer();
  private readonly tutorial = new TutorialRenderer();

  private readonly entities: EntityRenderer;
  private readonly players: PlayerRenderer;

  private readonly screenShake = new ScreenShake();
  private readonly floatingTexts = new FloatingTextRenderer();

  private lastFrameTime = performance.now();

  public constructor(private readonly root: HTMLElement) {
    this.entities = new EntityRenderer();
    this.players = new PlayerRenderer();

    this.canvas = document.createElement("canvas");

    root.replaceChildren(this.canvas);

    const context = this.canvas.getContext("2d");

    if (context === null) {
      throw new Error("Canvas 2D context is unavailable");
    }

    this.context = context;

    this.resize();

    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    const ctx = this.context;

    const now = performance.now();
    const rawDelta = (now - this.lastFrameTime) / 1000;
    const deltaTime = Math.min(rawDelta, 0.033);

    this.audioEventPlayer.play(snapshot, playerId);

    this.lastFrameTime = now;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (snapshot === undefined) {
      snapshot = EMPTY_SNAPSHOT;
    }

    const viewport = createRenderViewport(this.canvas.width, this.canvas.height, snapshot);

    this.screenShake.update(snapshot, playerId);
    this.floatingTexts.update(snapshot);

    this.background.draw(ctx, this.canvas, snapshot, viewport);
    this.tutorial.draw(ctx, snapshot, viewport);

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
    this.foreground.draw(ctx, this.canvas, snapshot, viewport);

    ctx.restore();
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);

    this.canvas.remove();
  }

  private readonly resize = (): void => {
    const size = getViewSize(this.root);

    if (this.canvas.width !== size.width) {
      this.canvas.width = size.width;
    }

    if (this.canvas.height !== size.height) {
      this.canvas.height = size.height;
    }

    this.canvas.style.width = `${size.styleWidth}px`;
    this.canvas.style.height = `${size.styleHeight}px`;
  };
}
