import Phaser from "phaser";

import type { GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";

import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import type { RenderViewport } from "../../viewport.js";

import { DebugRenderer } from "./DebugRenderer.js";
import { SmashEffectRenderer } from "./SmashEffectRenderer.js";
import { FloatingTextRenderer } from "./FloatingTextRenderer.js";
import { SpriteAnimationState } from "../animations/SpriteAnimationState.js";
import { getSpriteTransform } from "../animations/SpriteTransformAnimator.js";

type PlayerObject = {
  image?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Rectangle;
};

const DEPTH = 50;

export class PlayerRenderer {
  private readonly objects = new Map<string, PlayerObject>();
  private readonly smashEffectRenderer: SmashEffectRenderer;
  private readonly floatingTextRenderer: FloatingTextRenderer;
  private readonly debugRenderer: DebugRenderer;
  private readonly animationState = new SpriteAnimationState();

  public constructor(private readonly scene: Phaser.Scene) {
    this.smashEffectRenderer = new SmashEffectRenderer(scene);
    this.floatingTextRenderer = new FloatingTextRenderer(scene);
    this.debugRenderer = new DebugRenderer(scene);
  }

  public draw(snapshot: GameSnapshot, localPlayerId: PlayerId | undefined, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    this.debugRenderer.beginFrame();

    for (const player of snapshot.players) {
      visibleIds.add(player.id);
      this.drawPlayer(snapshot, player, player.playerId === localPlayerId, viewport);
    }

    this.smashEffectRenderer.draw(snapshot, viewport);
    this.floatingTextRenderer.draw(snapshot, viewport);
    this.removeMissingPlayers(visibleIds);
  }

  public destroy(): void {
    for (const object of this.objects.values()) {
      object.image?.destroy();
      object.fallback?.destroy();
    }

    this.smashEffectRenderer.destroy();
    this.floatingTextRenderer.destroy();
    this.debugRenderer.destroy();
    this.animationState.clear();

    this.objects.clear();
  }

  private drawPlayer(snapshot: GameSnapshot, player: PlayerSnapshot, isLocal: boolean, viewport: RenderViewport): void {
    const object = this.getPlayerObject(player.id);

    const [worldWidth, worldHeight] = player.size;

    const physicsWidth = viewport.worldToScreenSize(worldWidth);
    const physicsHeight = viewport.worldToScreenSize(worldHeight);

    const screenX = viewport.worldToScreenSize(player.x);
    const screenY = viewport.worldToScreenY(player.y);

    const x = screenX + physicsWidth / 2;
    const y = screenY + physicsHeight;

    const imageKey = `player.${player.kind}`;
    const image = images.getLoaded(getImageAsset(imageKey));

    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;
    const alpha = shouldBlinkOff ? 0.35 : 1;

    const now = this.scene.time.now;
    const animation = this.animationState.resolvePlayer(player, now);
    const transform = getSpriteTransform(animation.kind, (now - animation.startedAt) / 1000);

    const sprite = this.getOrCreateImage(object, imageKey, image);

    const baseScale = Math.min(physicsWidth / image.naturalWidth, physicsHeight / image.naturalHeight);

    sprite.setVisible(true);
    sprite.setPosition(Math.round(x + transform.offsetX), Math.round(y + transform.offsetY));
    sprite.setScale(baseScale * transform.scaleX, baseScale * transform.scaleY);
    sprite.setRotation(transform.rotation);
    sprite.setFlipX(true);
    sprite.setAlpha(alpha);

    object.fallback?.setVisible(false);

    this.debugRenderer.drawBounds({
      object: player,
      screenX,
      screenY,
      viewport,
    });
  }

  private getPlayerObject(id: string): PlayerObject {
    const existing = this.objects.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const created: PlayerObject = {};
    this.objects.set(id, created);

    return created;
  }

  private getOrCreateImage(object: PlayerObject, imageKey: string, source: HTMLImageElement): Phaser.GameObjects.Image {
    if (!this.scene.textures.exists(imageKey)) {
      this.scene.textures.addImage(imageKey, source);
    }

    if (object.image !== undefined && object.image.texture.key === imageKey) {
      return object.image;
    }

    object.image?.destroy();

    const image = this.scene.add.image(0, 0, imageKey);

    image.setOrigin(0.5, 1);
    image.setDepth(DEPTH);
    image.setVisible(false);

    object.image = image;

    return image;
  }

  private removeMissingPlayers(visibleIds: Set<string>): void {
    for (const [id, object] of this.objects.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      object.image?.destroy();
      object.fallback?.destroy();

      this.animationState.remove(id);
      this.objects.delete(id);
    }
  }
}
