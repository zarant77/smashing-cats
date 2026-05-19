import Phaser from "phaser";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { BackgroundRenderer } from "./renderers/BackgroundRenderer.js";
import { EntityRenderer } from "./renderers/EntityRenderer.js";
import { ForegroundRenderer } from "./renderers/ForegroundRenderer.js";
import { GroundRenderer } from "./renderers/GroundRenderer.js";
import { PlayerRenderer } from "./renderers/PlayerRenderer.js";
import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";
import { createRenderViewport, type RenderViewport } from "../viewport.js";

export class SmashingCatsScene extends Phaser.Scene {
  private snapshot: GameSnapshot = EMPTY_SNAPSHOT;
  private playerId: PlayerId | undefined;

  private t: Translator = (key) => key;

  private background?: BackgroundRenderer;
  private ground?: GroundRenderer;
  private entities?: EntityRenderer;
  private players?: PlayerRenderer;
  private foreground?: ForegroundRenderer;

  private viewport!: RenderViewport;

  public constructor() {
    super("SmashingCatsScene");
  }

  public create(): void {
    this.viewport = createRenderViewport(this.scale.width, this.scale.height, this.snapshot);

    this.background = new BackgroundRenderer(this, this.t);
    this.ground = new GroundRenderer(this, this.t);
    this.entities = new EntityRenderer(this, this.t);
    this.players = new PlayerRenderer(this, this.t);
    this.foreground = new ForegroundRenderer(this, this.t);
  }

  public update(): void {
    this.updateViewport();

    this.background?.draw(this.snapshot, this.viewport);
    this.ground?.draw(this.snapshot, this.viewport);
    this.entities?.draw(this.snapshot, this.viewport);
    this.players?.draw(this.snapshot, this.playerId, this.viewport);
    this.foreground?.draw(this.snapshot, this.viewport);
  }

  public setState(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.snapshot = snapshot ?? EMPTY_SNAPSHOT;
    this.playerId = playerId;
  }

  public setTranslator(t: Translator): void {
    this.t = t;

    this.background?.setTranslator(t);
    this.ground?.setTranslator(t);
    this.entities?.setTranslator(t);
    this.players?.setTranslator(t);
    this.foreground?.setTranslator(t);
  }

  public resize(): void {
    this.updateViewport();
  }

  private updateViewport(): void {
    if (!this.scale) {
      return;
    }

    this.viewport = createRenderViewport(this.scale.width, this.scale.height, this.snapshot);
  }
}
