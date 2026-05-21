import * as THREE from "three";

import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

import type { RenderViewport } from "../../viewport.js";
import type { ThreeModelFactory } from "../models/ThreeModelFactory.js";
import { ThreeModelAnimator } from "../models/ThreeModelAnimator.js";
import { DebugRenderer } from "./DebugRenderer.js";

type PlayerObject = {
  model: THREE.Group;
  baseSize: THREE.Vector3;
};

const Y_OFFSET = -200;
const RENDER_ORDER = 10;

export class PlayerRenderer {
  private readonly players = new Map<string, PlayerObject>();
  private readonly playerLoads = new Map<string, Promise<void>>();
  private readonly animator: ThreeModelAnimator;
  private readonly debugRenderer: DebugRenderer;

  private destroyed = false;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly modelFactory: ThreeModelFactory,
  ) {
    this.animator = new ThreeModelAnimator(scene, camera);
    this.debugRenderer = new DebugRenderer(scene);
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport, _localPlayerId: PlayerId | undefined): void {
    const visibleIds = new Set<string>();

    this.debugRenderer.beginFrame();

    for (const player of snapshot.players) {
      visibleIds.add(player.id);

      const object = this.players.get(player.id);

      if (object === undefined) {
        if (!this.playerLoads.has(player.id)) {
          this.playerLoads.set(player.id, this.createPlayer(player.id, player.kind));
        }

        continue;
      }

      const [width, height] = player.size;

      const physicsWidth = viewport.worldToScreenSize(width);
      const physicsHeight = viewport.worldToScreenSize(height);

      const x = viewport.worldToScreenSize(player.x + width / 2);
      const y = viewport.worldToScreenY(player.y + height + Y_OFFSET);

      const screenX = x - physicsWidth / 2;
      const screenY = y - physicsHeight;

      const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

      object.model.visible = player.alive && !shouldBlinkOff;

      object.model.position.x = Math.round(x);
      object.model.position.y = Math.round(y);

      const fitScaleX = object.baseSize.x > 0 ? physicsWidth / object.baseSize.x : 1;
      const fitScaleY = object.baseSize.y > 0 ? physicsHeight / object.baseSize.y : 1;
      const scale = Math.min(fitScaleX, fitScaleY);

      this.animator.animate({
        model: object.model,
        snapshot: player,
        tick: snapshot.tick,
        baseScale: scale,
        baseScaleZ: -scale,
        baseRotationX: Math.PI,
      });

      this.debugRenderer.drawBounds({
        shape: {
          size: player.size,
          hurt: player.hurt,
          smash: player.smash,
        },
        screenX,
        screenY,
        viewport,
      });
    }

    this.cleanup(visibleIds);
  }

  public destroy(): void {
    this.destroyed = true;

    for (const object of this.players.values()) {
      this.dispose(object);
    }

    this.debugRenderer.destroy();

    this.players.clear();
    this.playerLoads.clear();
  }

  private async createPlayer(id: string, kind: string): Promise<void> {
    const key = `player.${kind}`;

    try {
      const model = await this.modelFactory.create(key);

      if (this.destroyed || !this.playerLoads.has(id)) {
        return;
      }

      model.traverse((child) => {
        child.renderOrder = RENDER_ORDER;

        if (!(child instanceof THREE.Mesh)) {
          return;
        }

        child.frustumCulled = false;
        child.castShadow = false;
        child.receiveShadow = false;
      });

      model.visible = false;

      const bounds = new THREE.Box3().setFromObject(model);
      const baseSize = new THREE.Vector3();

      bounds.getSize(baseSize);

      this.scene.add(model);
      this.players.set(id, { model, baseSize });
    } catch (error) {
      console.warn(`[three] failed to create player model: ${kind}`);
      console.error(error);
    }
  }

  private cleanup(visibleIds: Set<string>): void {
    for (const [id, object] of this.players.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      this.dispose(object);
      this.players.delete(id);
      this.playerLoads.delete(id);
    }
  }

  private dispose(object: PlayerObject): void {
    this.scene.remove(object.model);
  }
}
