import * as THREE from "three";

import type { HurtCircle, Size, SmashBox } from "@smashing-cats/protocol";

import type { RenderViewport } from "../../viewport.js";

type DebugShape = {
  size: Size;
  hurt?: HurtCircle;
  smash?: SmashBox;
};

type DebugRenderInput = {
  shape: DebugShape;
  screenX: number;
  screenY: number;
  viewport: RenderViewport;
};

const DEBUG_RENDER_ORDER = 100;

const SIZE_COLOR = 0x3399ff;
const HURT_COLOR = 0xff3333;
const SMASH_COLOR = 0xffdd33;

export class DebugRenderer {
  private readonly group = new THREE.Group();

  private readonly sizeMaterial = this.createMaterial(SIZE_COLOR);
  private readonly hurtMaterial = this.createMaterial(HURT_COLOR);
  private readonly smashMaterial = this.createMaterial(SMASH_COLOR);

  public constructor(private readonly scene: THREE.Scene) {
    this.group.renderOrder = DEBUG_RENDER_ORDER;
    this.group.visible = false;

    this.scene.add(this.group);
  }

  public beginFrame(): void {
    this.clear();
    this.group.visible = window.debug.boundings;
  }

  public drawBounds(input: DebugRenderInput): void {
    if (!window.debug.boundings) {
      return;
    }

    const [worldWidth, worldHeight] = input.shape.size;

    const width = input.viewport.worldToScreenSize(worldWidth);
    const height = input.viewport.worldToScreenSize(worldHeight);

    const left = input.screenX;
    const top = input.screenY;

    this.drawBox(left, top, width, height, this.sizeMaterial);
    this.drawHurt(input.shape.hurt, left, top, width, height, input.viewport);
    this.drawSmash(input.shape.smash, left, top, width, height, input.viewport);
  }

  public destroy(): void {
    this.clear();

    this.sizeMaterial.dispose();
    this.hurtMaterial.dispose();
    this.smashMaterial.dispose();

    this.scene.remove(this.group);
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

    const worldRadius = radius * viewport.scale;

    const centerX = left + objectWidth / 2 + offsetX * viewport.scale;
    const centerY = top + objectHeight / 2 + offsetY * viewport.scale;

    const geometry = new THREE.SphereGeometry(worldRadius, 12, 12);

    const wireframe = new THREE.WireframeGeometry(geometry);

    const lines = new THREE.LineSegments(wireframe, this.hurtMaterial);

    lines.position.set(centerX, centerY, 0);

    lines.renderOrder = DEBUG_RENDER_ORDER;

    this.group.add(lines);

    geometry.dispose();
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

    this.drawBox(smashX, top, smashWidth, smashHeight, this.smashMaterial);
  }

  private drawBox(x: number, y: number, width: number, height: number, material: THREE.LineBasicMaterial): void {
    const geometry = new THREE.BoxGeometry(width, height, width);

    const wireframe = new THREE.WireframeGeometry(geometry);

    const lines = new THREE.LineSegments(wireframe, material);

    lines.position.set(x + width / 2, y + height / 2, 0);

    lines.renderOrder = DEBUG_RENDER_ORDER;

    this.group.add(lines);

    geometry.dispose();
  }

  private createMaterial(color: number): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
  }

  private clear(): void {
    for (const child of this.group.children) {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
      }
    }

    this.group.clear();
  }
}
