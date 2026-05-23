import Phaser from "phaser";

import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

import { BackgroundRenderer } from "./renderers/BackgroundRenderer.js";
import { EntityRenderer } from "./renderers/EntityRenderer.js";
import { ForegroundRenderer } from "./renderers/ForegroundRenderer.js";
import { GroundRenderer } from "./renderers/GroundRenderer.js";
import { PlayerRenderer } from "./renderers/PlayerRenderer.js";
import { ParticlesRenderer } from "./renderers/ParticlesRenderer.js";
import { HitStopController } from "./effects/HitStopController.js";

import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";
import { createRenderViewport, type RenderViewport } from "../viewport.js";
import { registerLoadedImages } from "./helpers.js";

export class SmashingCatsScene extends Phaser.Scene {
  private snapshot: GameSnapshot = EMPTY_SNAPSHOT;
  private playerId: PlayerId | undefined;

  private background?: BackgroundRenderer;
  private ground?: GroundRenderer;
  private entities?: EntityRenderer;
  private players?: PlayerRenderer;
  private particles?: ParticlesRenderer;
  private foreground?: ForegroundRenderer;

  private readonly hitStop = new HitStopController(this);

  private viewport!: RenderViewport;

  public constructor() {
    super("SmashingCatsScene");
  }

  public create(): void {
    registerLoadedImages(this);

    this.viewport = createRenderViewport(this.scale.width, this.scale.height, this.snapshot);

    this.background = new BackgroundRenderer(this);
    this.ground = new GroundRenderer(this);
    this.entities = new EntityRenderer(this);
    this.players = new PlayerRenderer(this);
    this.particles = new ParticlesRenderer(this, 10);
    this.foreground = new ForegroundRenderer(this);
  }

  public update(_time: number, delta: number): void {
    const renderSnapshot = this.hitStop.update(this.snapshot);

    this.updateViewport(renderSnapshot);

    const deltaTime = this.hitStop.isFrozen() ? 0 : delta / 1000;
    const screenWorldRight = this.scale.width / this.viewport.scale;

    this.background?.draw(renderSnapshot, this.viewport);
    this.ground?.draw(renderSnapshot, this.viewport);
    this.entities?.draw(renderSnapshot, this.viewport);
    this.players?.draw(renderSnapshot, this.playerId, this.viewport);
    this.particles?.update(deltaTime, screenWorldRight);
    this.foreground?.draw(renderSnapshot, this.viewport);
  }

  public setState(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.snapshot = snapshot ?? EMPTY_SNAPSHOT;
    this.playerId = playerId;
  }

  public resize(): void {
    this.updateViewport(this.snapshot);
  }

  private updateViewport(snapshot: GameSnapshot): void {
    if (!this.scale) {
      return;
    }

    this.viewport = createRenderViewport(this.scale.width, this.scale.height, snapshot);
  }
}
