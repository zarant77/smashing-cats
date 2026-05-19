import Phaser from "phaser";
import type { GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { assets } from "../../../assets/assets.js";
import type { RenderViewport } from "../../viewport.js";

type PlayerObject = {
  image?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Rectangle;
};

type RenderSize = {
  width: number;
  height: number;
};

const DEPTH = 50;

export class PlayerRenderer {
  private readonly objects = new Map<string, PlayerObject>();

  public constructor(
    private readonly scene: Phaser.Scene,
    private t: Translator,
  ) {}

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  public draw(snapshot: GameSnapshot, localPlayerId: PlayerId | undefined, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    for (const player of snapshot.players) {
      visibleIds.add(player.id);
      this.drawPlayer(snapshot, player, player.playerId === localPlayerId, viewport);
    }

    this.removeMissingPlayers(visibleIds);
  }

  public destroy(): void {
    for (const object of this.objects.values()) {
      object.image?.destroy();
      object.fallback?.destroy();
    }

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

    const imagePath = `/canvas/players/${player.kind}.png`;
    const image = assets.get(imagePath);
    const renderSize = this.getRenderSize(image, physicsWidth, physicsHeight);

    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;
    const alpha = shouldBlinkOff ? 0.35 : 1;

    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      const sprite = this.getOrCreateImage(object, imagePath, image);

      sprite.setVisible(true);
      sprite.setPosition(Math.round(x), Math.round(y));
      sprite.setDisplaySize(Math.round(renderSize.width), Math.round(renderSize.height));
      sprite.setAlpha(player.alive ? alpha : 0.45);
      sprite.setFlipX(true);
      sprite.setTint(player.alive ? 0xffffff : 0x777777);

      object.fallback?.setVisible(false);

      return;
    }

    const fallback = this.getOrCreateFallback(object, isLocal);

    fallback.setVisible(true);
    fallback.setPosition(Math.round(screenX), Math.round(screenY));
    fallback.setSize(Math.round(physicsWidth), Math.round(physicsHeight));
    fallback.setAlpha(player.alive ? alpha : 0.45);
    fallback.setFillStyle(isLocal ? 0xffcc33 : 0xf58ad4);

    object.image?.setVisible(false);
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

  private getOrCreateImage(object: PlayerObject, imagePath: string, source: HTMLImageElement): Phaser.GameObjects.Image {
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

  private getOrCreateFallback(object: PlayerObject, isLocal: boolean): Phaser.GameObjects.Rectangle {
    if (object.fallback !== undefined) {
      return object.fallback;
    }

    const fallback = this.scene.add.rectangle(0, 0, 1, 1, isLocal ? 0xffcc33 : 0xf58ad4);

    fallback.setOrigin(0, 0);
    fallback.setDepth(DEPTH);
    fallback.setVisible(false);

    object.fallback = fallback;

    return fallback;
  }

  private removeMissingPlayers(visibleIds: Set<string>): void {
    for (const [id, object] of this.objects.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      object.image?.destroy();
      object.fallback?.destroy();

      this.objects.delete(id);
    }
  }

  private getRenderSize(image: HTMLImageElement, fallbackWidth: number, fallbackHeight: number): RenderSize {
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
}
