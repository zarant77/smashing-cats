import * as THREE from "three";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";
import { createRenderViewport, type RenderViewport } from "../viewport.js";
import type { ThreeModelFactory } from "./models/ThreeModelFactory.js";
import { ThreeCamera } from "./ThreeCamera.js";
import { ThreeLights } from "./ThreeLights.js";
import { BackgroundRenderer } from "./renderers/BackgroundRenderer.js";
import { EntityRenderer } from "./renderers/EntityRenderer.js";
import { ForegroundRenderer } from "./renderers/ForegroundRenderer.js";
import { GroundRenderer } from "./renderers/GroundRenderer.js";
import { PlayerRenderer } from "./renderers/PlayerRenderer.js";

export class SmashingCatsThreeScene {
  public readonly domElement: HTMLCanvasElement;

  private readonly scene = new THREE.Scene();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: ThreeCamera;
  private readonly lights: ThreeLights;

  private readonly backgroundRenderer: BackgroundRenderer;
  private readonly groundRenderer: GroundRenderer;
  private readonly entityRenderer: EntityRenderer;
  private readonly playerRenderer: PlayerRenderer;
  private readonly foregroundRenderer: ForegroundRenderer;

  private width: number;
  private height: number;

  private snapshot: GameSnapshot = EMPTY_SNAPSHOT;
  private playerId: PlayerId | undefined;
  private viewport: RenderViewport;

  public constructor(width: number, height: number, models: ThreeModelFactory) {
    this.width = width;
    this.height = height;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0xbcdfe5, 1);

    this.domElement = this.renderer.domElement;

    this.camera = new ThreeCamera(width, height);

    this.lights = new ThreeLights(this.scene);

    this.viewport = createRenderViewport(width, height, this.snapshot);

    this.backgroundRenderer = new BackgroundRenderer(this.scene);
    this.groundRenderer = new GroundRenderer(this.scene, models);
    this.entityRenderer = new EntityRenderer(this.scene, this.camera.active, models);
    this.playerRenderer = new PlayerRenderer(this.scene, this.camera.active, models);
    this.foregroundRenderer = new ForegroundRenderer(this.scene);
  }

  public async init(): Promise<void> {
    await this.groundRenderer.init();
  }

  public setState(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.snapshot = snapshot ?? EMPTY_SNAPSHOT;
    this.playerId = playerId;
  }

  public setTranslator(_t: Translator): void {}

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);

    this.camera.resize(width, height);

    this.viewport = createRenderViewport(width, height, this.snapshot);
  }

  public render(): void {
    this.viewport = createRenderViewport(this.width, this.height, this.snapshot);

    this.backgroundRenderer.draw(this.snapshot, this.viewport);
    this.groundRenderer.draw(this.snapshot, this.viewport);
    this.entityRenderer.draw(this.snapshot, this.viewport);
    this.playerRenderer.draw(this.snapshot, this.viewport, this.playerId);
    this.foregroundRenderer.draw(this.snapshot, this.viewport);

    this.renderer.render(this.scene, this.camera.active);
  }

  public destroy(): void {
    this.backgroundRenderer.destroy();
    this.groundRenderer.destroy();
    this.entityRenderer.destroy();
    this.playerRenderer.destroy();
    this.foregroundRenderer.destroy();

    this.lights.destroy(this.scene);
    this.renderer.dispose();
  }
}
