import * as THREE from "three";
import type { EntitySnapshot, PlayerSnapshot } from "@smashing-cats/protocol";

type AnimatedSnapshot = PlayerSnapshot | EntitySnapshot;

type FlyToScreenState = {
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  rotateDirection: number;
  startedTick: number;
  cracked: boolean;
};

type ScreenCrack = {
  sprite: THREE.Sprite;
  expiresTick: number;
};

type AnimateInput = {
  model: THREE.Group;
  snapshot: AnimatedSnapshot;
  tick: number;
  baseScale: number;
  baseScaleX?: number;
  baseScaleY?: number;
  baseScaleZ?: number;
  baseRotationX?: number;
};

const FLY_TO_SCREEN_FLY_TICKS = 15;
const FLY_TO_SCREEN_FALL_TICKS = 35;
const FLY_TO_SCREEN_FALL_DISTANCE = 900;

const SCREEN_CRACK_TICKS = 45;
const SCREEN_CRACK_SCALE = 260;

const FLY_TO_SCREEN_PLANE_POSITION = new THREE.Vector3(0, 0, -1500);
const SCREEN_CRACK_TEXTURE_PATH = "/canvas/effects/screen-crack.png";

export class ThreeModelAnimator {
  private readonly flyToScreenStates = new Map<string, FlyToScreenState>();
  private readonly screenCracks: ScreenCrack[] = [];

  private readonly screenCrackTexture = new THREE.TextureLoader().load(SCREEN_CRACK_TEXTURE_PATH);

  private readonly flyToScreenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
    }),
  );

  public constructor(
    private readonly scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    this.flyToScreenPlane.position.copy(FLY_TO_SCREEN_PLANE_POSITION);
    this.flyToScreenPlane.renderOrder = 9999;
    this.flyToScreenPlane.visible = false;

    camera.add(this.flyToScreenPlane);
    this.scene.add(camera);

    this.updateFlyToScreenPlane(camera);
  }

  public animate(input: AnimateInput): void {
    this.updateScreenCracks(input.tick);

    const animation = this.getAnimation(input.snapshot);
    const time = input.tick * 0.12 + this.getPhase(input.snapshot.id);

    if (animation === "flyToScreen") {
      this.animateFlyToScreen(input);
      return;
    }

    this.flyToScreenStates.delete(input.snapshot.id);

    const baseScaleX = input.baseScaleX ?? input.baseScale;
    const baseScaleY = input.baseScaleY ?? input.baseScale;
    const baseScaleZ = input.baseScaleZ ?? input.baseScale;

    input.model.scale.set(
      baseScaleX * this.getScaleX(animation, time),
      baseScaleY * this.getScaleY(animation, time),
      baseScaleZ,
    );

    input.model.rotation.x = input.baseRotationX ?? 0;
    input.model.rotation.z = this.getRotationZ(animation, time);
  }

  private animateFlyToScreen(input: AnimateInput): void {
    const state = this.getFlyToScreenState(input);

    const flyProgress = Math.min(1, (input.tick - state.startedTick) / FLY_TO_SCREEN_FLY_TICKS);

    const fallProgress = Math.min(1, Math.max(0, input.tick - state.startedTick - FLY_TO_SCREEN_FLY_TICKS) / FLY_TO_SCREEN_FALL_TICKS);

    const flyEased = this.easeOutCubic(flyProgress);
    const fallEased = this.easeInCubic(fallProgress);

    input.model.position.lerpVectors(state.startPosition, state.targetPosition, flyEased);
    input.model.position.y += FLY_TO_SCREEN_FALL_DISTANCE * fallEased;

    input.model.scale.set(input.baseScaleX ?? input.baseScale, input.baseScaleY ?? input.baseScale, input.baseScaleZ ?? input.baseScale);

    input.model.rotation.x = input.baseRotationX ?? 0;

    if (flyProgress >= 1 && !state.cracked) {
      this.spawnScreenCrack(state.targetPosition, input.tick);
      state.cracked = true;
    }

    if (fallProgress > 0) {
      input.model.rotation.z = state.rotateDirection * (4 + fallEased * 10);
      return;
    }

    input.model.rotation.z = state.rotateDirection * flyEased * 4;
  }

  private getFlyToScreenState(input: AnimateInput): FlyToScreenState {
    const existing = this.flyToScreenStates.get(input.snapshot.id);

    if (existing !== undefined) {
      return existing;
    }

    const seed = this.getHash(input.snapshot.id);

    const state: FlyToScreenState = {
      startPosition: input.model.position.clone(),
      targetPosition: this.getRandomFlyToScreenPoint(seed),
      rotateDirection: seed % 2 === 0 ? 1 : -1,
      startedTick: input.tick,
      cracked: false,
    };

    this.flyToScreenStates.set(input.snapshot.id, state);

    return state;
  }

  private getRandomFlyToScreenPoint(seed: number): THREE.Vector3 {
    const x = this.mapHash(seed * 13, -0.5, 0.5);
    const y = this.mapHash(seed * 29, -0.5, 0.5);

    const point = new THREE.Vector3(x, y, 0);

    this.flyToScreenPlane.localToWorld(point);

    return point;
  }

  private spawnScreenCrack(position: THREE.Vector3, tick: number): void {
    const material = new THREE.SpriteMaterial({
      map: this.screenCrackTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);

    sprite.position.copy(position);
    sprite.scale.set(SCREEN_CRACK_SCALE, SCREEN_CRACK_SCALE, 1);
    sprite.renderOrder = 80;

    this.scene.add(sprite);

    this.screenCracks.push({
      sprite,
      expiresTick: tick + SCREEN_CRACK_TICKS,
    });
  }

  private updateScreenCracks(tick: number): void {
    for (let i = this.screenCracks.length - 1; i >= 0; i--) {
      const crack = this.screenCracks[i];

      if (tick < crack.expiresTick) {
        continue;
      }

      crack.sprite.removeFromParent();
      crack.sprite.material.dispose();

      this.screenCracks.splice(i, 1);
    }
  }

  private getAnimation(snapshot: AnimatedSnapshot): string {
    if (!snapshot.alive) {
      return snapshot.animations?.death ?? "death";
    }

    if ("smashing" in snapshot && snapshot.smashing) {
      return snapshot.animations?.attack ?? "smash";
    }

    if ("grounded" in snapshot && !snapshot.grounded) {
      return snapshot.animations?.jump ?? "jump";
    }

    return snapshot.animations?.idle ?? "idle";
  }

  private getScaleX(animation: string, time: number): number {
    switch (animation) {
      case "bounce":
        return 1 + Math.sin(time) * 0.035;

      case "walk":
        return 1 + Math.sin(time * 1.5) * 0.04;

      case "fly":
        return 1 + Math.sin(time * 3) * 0.06;

      case "jump":
        return 0.92;

      case "smash":
        return 1.12;

      case "squish":
        return 1.35;

      default:
        return 1;
    }
  }

  private getScaleY(animation: string, time: number): number {
    switch (animation) {
      case "bounce":
        return 1 + Math.cos(time * 0.9) * 0.04;

      case "walk":
        return 1 + Math.cos(time * 1.5) * 0.035;

      case "fly":
        return 1 + Math.cos(time * 3) * 0.08;

      case "jump":
        return 1.08;

      case "smash":
        return 0.88;

      case "squish":
        return 0.2;

      default:
        return 1;
    }
  }

  private getRotationZ(animation: string, time: number): number {
    switch (animation) {
      case "bounce":
        return Math.sin(time * 0.7) * 0.025;

      case "walk":
        return Math.sin(time * 2) * 0.04;

      case "swing":
        return Math.sin(time * 0.8) * 0.12;

      case "fly":
        return Math.sin(time * 4) * 0.08;

      case "jump":
        return -0.22;

      case "smash":
        return -0.35;

      case "fall":
        return -0.6;

      case "squish":
        return 0;

      default:
        return 0;
    }
  }

  private easeInCubic(value: number): number {
    return value * value * value;
  }

  private easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }

  private mapHash(hash: number, min: number, max: number): number {
    const normalized = Math.abs(hash % 1000) / 1000;

    return min + (max - min) * normalized;
  }

  private getPhase(id: string): number {
    return (Math.abs(this.getHash(id) % 1000) / 1000) * Math.PI * 2;
  }

  private getHash(id: string): number {
    let hash = 0;

    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }

    return hash;
  }

  private updateFlyToScreenPlane(camera: THREE.PerspectiveCamera): void {
    const distance = Math.abs(FLY_TO_SCREEN_PLANE_POSITION.z);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * distance * Math.tan(fov / 2);
    const width = height * camera.aspect;

    this.flyToScreenPlane.scale.set(width, height, 1);
  }
}
