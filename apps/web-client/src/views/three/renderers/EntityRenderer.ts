import * as THREE from "three";
import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";
import type { ThreeModelCache } from "../models/ThreeModelCache.js";
import { ThreeModels, type ThreeModelDefinition } from "../models/threeModels.js";

type EntityObject = {
  model: THREE.Group;
};

const BASE_SCALE = 75;
const Y_OFFSET = -200;
const Z_OFFSET = 0;
const RENDER_ORDER = 80;

export class EntityRenderer {
  private readonly entities = new Map<string, EntityObject>();
  private readonly entityLoads = new Map<string, Promise<void>>();

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly models: ThreeModelCache,
  ) {}

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
      const z = viewport.worldToScreenY(Z_OFFSET);

      object.model.visible = entity.alive;

      object.model.position.set(Math.round(x), Math.round(y), Math.round(z));

      const scale = viewport.scale * BASE_SCALE;

      object.model.scale.set(scale, scale, scale);
      object.model.rotation.x = Math.PI;
    }

    this.cleanup(visibleIds);
  }

  public destroy(): void {
    for (const object of this.entities.values()) {
      this.dispose(object);
    }

    this.entities.clear();
    this.entityLoads.clear();
  }

  private async createEntity(entity: EntitySnapshot): Promise<void> {
    const definition = this.getModelDefinition(entity);

    if (definition === undefined) {
      console.warn(`[three] missing entity model: ${entity.type} / ${entity.kind}`);
      return;
    }

    try {
      const model = await this.models.clone(definition);

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

  private getModelDefinition(entity: EntitySnapshot): ThreeModelDefinition | undefined {
    switch (entity.type) {
      case "enemy":
        return ThreeModels.Enemies[entity.kind as keyof typeof ThreeModels.Enemies];

      case "civilian":
        return ThreeModels.Civilians[entity.kind as keyof typeof ThreeModels.Civilians];

      case "obstacle":
        return ThreeModels.Obstactes[entity.kind as keyof typeof ThreeModels.Obstactes];

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
