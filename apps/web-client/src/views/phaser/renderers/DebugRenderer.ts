import Phaser from "phaser";

import type { HurtCircle, Size, SmashBox } from "@smashing-cats/protocol";

import type { RenderViewport } from "../../viewport.js";

type DebugShape = {
  size: Size;
  hurt?: HurtCircle;
  smash?: SmashBox;
};

type DebugRenderInput = {
  object: DebugShape;
  screenX: number;
  screenY: number;
  viewport: RenderViewport;
};

const DEBUG_DEPTH = 9999;

const SIZE_COLOR = 0x3399ff;
const HURT_COLOR = 0xff3333;
const SMASH_COLOR = 0xffdd33;

const LINE_WIDTH = 2;
const LINE_ALPHA = 1;

export class DebugRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  public constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEBUG_DEPTH);
    this.graphics.setVisible(false);
  }

  public beginFrame(): void {
    this.graphics.clear();
    this.graphics.setVisible(window.debug.boundings);
  }

  public drawBounds(input: DebugRenderInput): void {
    if (!window.debug.boundings) {
      return;
    }

    const [worldWidth, worldHeight] = input.object.size;

    const width = input.viewport.worldToScreenSize(worldWidth);
    const height = input.viewport.worldToScreenSize(worldHeight);

    const left = input.screenX;
    const top = input.screenY;
    const bottom = top + height;

    this.drawSize(left, top, width, height);
    this.drawHurt(input.object.hurt, left, top, width, height, input.viewport);
    this.drawSmash(input.object.smash, left, top, width, height, input.viewport);
  }

  public destroy(): void {
    this.graphics.destroy();
  }

  private drawSize(x: number, y: number, width: number, height: number): void {
    this.graphics.lineStyle(LINE_WIDTH, SIZE_COLOR, LINE_ALPHA);

    this.graphics.strokeRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  private drawHurt(
    hurt: HurtCircle | undefined,
    left: number,
    top: number,
    objectWidth: number,
    objectHeight: number,
    viewport: RenderViewport,
  ): void {
    if (hurt === undefined) {
      return;
    }

    const [radius, offsetX, offsetY] = hurt;

    const objectCenterX = left + objectWidth / 2;
    const objectCenterY = top + objectHeight / 2;

    const hurtX = objectCenterX + offsetX * viewport.scale;
    const hurtY = objectCenterY + offsetY * viewport.scale;

    this.graphics.lineStyle(LINE_WIDTH, HURT_COLOR, LINE_ALPHA);

    this.graphics.strokeCircle(Math.round(hurtX), Math.round(hurtY), Math.round(radius * viewport.scale));
  }

  private drawSmash(
    smash: SmashBox | undefined,
    left: number,
    top: number,
    objectWidth: number,
    objectHeight: number,
    viewport: RenderViewport,
  ): void {
    if (smash === undefined) {
      return;
    }

    const [width, offsetX] = smash;

    const objectCenterX = left + objectWidth / 2;

    const smashWidth = width * viewport.scale;
    const smashHeight = objectHeight;

    const smashX = objectCenterX + offsetX * viewport.scale - smashWidth / 2;

    this.graphics.lineStyle(LINE_WIDTH, SMASH_COLOR, LINE_ALPHA);

    this.graphics.strokeRect(Math.round(smashX), Math.round(top), Math.round(smashWidth), Math.round(smashHeight));
  }
}
