import * as THREE from "three";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";
import type { ThreeModelCache } from "../models/ThreeModelCache.js";
import { ThreeModels } from "../models/threeModels.js";

type PlayerObject = {
  model: THREE.Group;
};

const BASE_SCALE = 75;
const Y_OFFSET = -200;
const Z_OFFSET = 0;
const RENDER_ORDER = 100;

export class PlayerRenderer {
  private readonly players = new Map<string, PlayerObject>();
  private readonly playerLoads = new Map<string, Promise<void>>();

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly models: ThreeModelCache,
  ) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport, localPlayerId: PlayerId | undefined): void {
    const visibleIds = new Set<string>();

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

      const x = viewport.worldToScreenSize(player.x + width / 2);
      const y = viewport.worldToScreenY(player.y + height + Y_OFFSET);
      const z = viewport.worldToScreenY(Z_OFFSET);

      const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

      object.model.visible = player.alive && !shouldBlinkOff;

      object.model.position.set(Math.round(x), Math.round(y), Math.round(z));

      const scale = viewport.scale * BASE_SCALE;

      object.model.scale.set(scale, scale, -scale);
      object.model.rotation.x = Math.PI;
    }

    this.cleanup(visibleIds);
  }

  public destroy(): void {
    for (const object of this.players.values()) {
      this.dispose(object);
    }

    this.players.clear();
    this.playerLoads.clear();
  }

  private async createPlayer(id: string, kind: string): Promise<void> {
    const path = ThreeModels.Players[kind as keyof typeof ThreeModels.Players];

    if (path === undefined) {
      console.warn(`[three] missing player model: ${kind}`);
      return;
    }

    try {
      const model = await this.models.clone(path);

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
      this.players.set(id, { model });
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
