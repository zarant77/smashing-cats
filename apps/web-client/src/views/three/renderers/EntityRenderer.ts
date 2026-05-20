import * as THREE from "three";
import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";
import type { ThreeModelFactory } from "../models/ThreeModelFactory.js";
import { ThreeModelAnimator } from "../models/ThreeModelAnimator.js";

type EntityObject = {
  model: THREE.Group;
};

const BASE_SCALE = 75;
const Y_OFFSET = -200;
const RENDER_ORDER = 80;

export class EntityRenderer {
  private readonly entities = new Map<string, EntityObject>();
  private readonly entityLoads = new Map<string, Promise<void>>();
  private readonly animator: ThreeModelAnimator;
  private destroyed = false;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly modelFactory: ThreeModelFactory,
  ) {
    this.animator = new ThreeModelAnimator(scene, camera);
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    for (const entity of snapshot.entities) {
      visibleIds.add(entity.id);

      const object = this.entities.get(entity.id);

      if (object === undefined) {
        if (!this.entityLoads.has(entity.id)) {
          this.entityLoads.set(entity.id, this.createEntity(entity));
        }

        continue;
      }

      const [width, height] = entity.size;

      const x = viewport.worldToScreenX(entity.x + width / 2);
      const y = viewport.worldToScreenY(entity.y + height + Y_OFFSET);

      object.model.visible = true;

      object.model.position.x = Math.round(x);
      object.model.position.y = Math.round(y);

      const scale = viewport.scale * BASE_SCALE;

      this.animator.animate({
        model: object.model,
        snapshot: entity,
        tick: snapshot.tick,
        baseScale: scale,
        baseRotationX: Math.PI,
      });
    }

    this.cleanup(visibleIds);
  }

  public destroy(): void {
    this.destroyed = true;

    for (const object of this.entities.values()) {
      this.dispose(object);
    }

    this.entities.clear();
    this.entityLoads.clear();
  }

  private async createEntity(entity: EntitySnapshot): Promise<void> {
    const key = this.getModelKey(entity);

    if (key === undefined) {
      console.warn(`[three] missing entity model key: ${entity.type} / ${entity.kind}`);
      return;
    }

    try {
      const model = await this.modelFactory.create(key);

      if (this.destroyed || !this.entityLoads.has(entity.id)) {
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

      this.scene.add(model);
      this.entities.set(entity.id, { model });
    } catch (error) {
      console.warn(`[three] failed to create entity model: ${entity.type} / ${entity.kind}`);
      console.error(error);
    }
  }

  private getModelKey(entity: EntitySnapshot): string | undefined {
    switch (entity.type) {
      case "enemy":
        return `enemy.${entity.kind}`;

      case "civilian":
        return `civilian.${entity.kind}`;

      case "obstacle":
        return `obstacle.${entity.kind}`;

      default:
        return undefined;
    }
  }

  private cleanup(visibleIds: Set<string>): void {
    for (const [id, object] of this.entities.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      this.dispose(object);
      this.entities.delete(id);
      this.entityLoads.delete(id);
    }
  }

  private dispose(object: EntityObject): void {
    this.scene.remove(object.model);
  }
}
