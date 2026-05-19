import Phaser from "phaser";
import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { assets } from "../../../assets/assets.js";
import type { RenderViewport } from "../../viewport.js";

type EntityObject = {
  image?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Rectangle;
};

type RenderSize = {
  width: number;
  height: number;
};

const DEPTH = 40;

export class EntityRenderer {
  private readonly objects = new Map<string, EntityObject>();

  public constructor(
    private readonly scene: Phaser.Scene,
    private t: Translator,
  ) {}

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    for (const entity of snapshot.entities) {
      visibleIds.add(entity.id);
      this.drawEntity(entity, viewport);
    }

    this.removeMissingEntities(visibleIds);
  }

  public destroy(): void {
    for (const object of this.objects.values()) {
      object.image?.destroy();
      object.fallback?.destroy();
    }

    this.objects.clear();
  }

  private drawEntity(entity: EntitySnapshot, viewport: RenderViewport): void {
    const [worldWidth, worldHeight] = entity.size;

    const physicsWidth = viewport.worldToScreenSize(worldWidth);
    const physicsHeight = viewport.worldToScreenSize(worldHeight);

    const screenX = viewport.worldToScreenX(entity.x);
    const screenY = viewport.worldToScreenY(entity.y);

    if (screenX + physicsWidth < 0 || screenX > viewport.screenWidth) {
      this.hideEntity(entity.id);
      return;
    }

    const object = this.getEntityObject(entity.id);
    const imagePath = getEntityImagePath(entity);
    const source = assets.get(imagePath);
    const renderSize = getRenderSize(source, physicsWidth, physicsHeight);

    const x = screenX + physicsWidth / 2;
    const y = screenY + physicsHeight;

    if (source.complete && source.naturalWidth > 0 && source.naturalHeight > 0) {
      const image = this.getOrCreateImage(object, imagePath, source);

      image.setVisible(true);
      image.setPosition(Math.round(x), Math.round(y));
      image.setDisplaySize(Math.round(renderSize.width), Math.round(renderSize.height));
      image.setAlpha(1);
      image.setFlipX(false);
      image.setTint(0xffffff);

      object.fallback?.setVisible(false);
      return;
    }

    const fallback = this.getOrCreateFallback(object, entity);

    fallback.setVisible(true);
    fallback.setPosition(Math.round(x), Math.round(y));
    fallback.setSize(Math.round(physicsWidth), Math.round(physicsHeight));
    fallback.setFillStyle(getEntityFallbackColor(entity));

    object.image?.setVisible(false);
  }

  private getEntityObject(id: string): EntityObject {
    const existing = this.objects.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const created: EntityObject = {};
    this.objects.set(id, created);

    return created;
  }

  private getOrCreateImage(object: EntityObject, imagePath: string, source: HTMLImageElement): Phaser.GameObjects.Image {
    const textureKey = imagePath.replaceAll("/", "_");

    if (!this.scene.textures.exists(textureKey)) {
      this.scene.textures.addImage(textureKey, source);
    }

    if (object.image !== undefined && object.image.texture.key === textureKey) {
      return object.image;
    }

    object.image?.destroy();

    const image = this.scene.add.image(0, 0, textureKey);

    image.setOrigin(0.5, 1);
    image.setDepth(DEPTH);
    image.setVisible(false);

    object.image = image;

    return image;
  }

  private getOrCreateFallback(object: EntityObject, entity: EntitySnapshot): Phaser.GameObjects.Rectangle {
    if (object.fallback !== undefined) {
      return object.fallback;
    }

    const fallback = this.scene.add.rectangle(0, 0, 1, 1, getEntityFallbackColor(entity));

    fallback.setOrigin(0.5, 1);
    fallback.setDepth(DEPTH);
    fallback.setVisible(false);

    object.fallback = fallback;

    return fallback;
  }

  private hideEntity(id: string): void {
    const object = this.objects.get(id);

    if (object === undefined) {
      return;
    }

    object.image?.setVisible(false);
    object.fallback?.setVisible(false);
  }

  private removeMissingEntities(visibleIds: Set<string>): void {
    for (const [id, object] of this.objects.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      object.image?.destroy();
      object.fallback?.destroy();
      this.objects.delete(id);
    }
  }
}

function getEntityImagePath(entity: EntitySnapshot): string {
  const postfix = entity.alive ? "" : "-dead";

  if (entity.type === "civilian") {
    return `/canvas/civilians/${entity.kind}${postfix}.png`;
  }

  if (entity.type === "obstacle") {
    return `/canvas/obstacles/${entity.kind}${postfix}.png`;
  }

  return `/canvas/enemies/${entity.kind}${postfix}.png`;
}

function getEntityFallbackColor(entity: EntitySnapshot): number {
  if (!entity.alive) {
    return 0x555555;
  }

  if (entity.type === "obstacle") {
    return 0x1e7f3e;
  }

  if (entity.type === "civilian") {
    return 0x4aa3df;
  }

  return 0x8b3a3a;
}

function getRenderSize(image: HTMLImageElement, fallbackWidth: number, fallbackHeight: number): RenderSize {
  if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return {
      width: fallbackWidth,
      height: fallbackHeight,
    };
  }

  return {
    width: fallbackWidth,
    height: fallbackWidth * (image.naturalHeight / image.naturalWidth),
  };
}
