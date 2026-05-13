import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import * as THREE from "three";
import type { Locale, Translator } from "../../i18n.js";
import type { GameView } from "../types.js";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 540;

const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 5000;

const GROUND_THICKNESS = 24;
const GROUND_DEPTH = 420;

export class ThreeView implements GameView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  private readonly objects = new Map<string, THREE.Mesh>();
  private readonly root: HTMLElement;

  private t: Translator = (key) => key;

  public constructor(root: HTMLElement) {
    this.root = root;
    this.root.replaceChildren();

    this.scene.background = new THREE.Color(0x87ceeb);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.root.appendChild(this.renderer.domElement);

    this.setupLights();

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.resize();

    if (snapshot === undefined) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.updateCamera(snapshot);
    this.drawGround();
    this.drawEntities(snapshot);
    this.drawPlayers(snapshot, playerId);
    this.cleanup(snapshot);

    this.renderer.render(this.scene, this.camera);
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.t = t;
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize);

    for (const object of this.objects.values()) {
      this.disposeObject(object);
    }

    this.objects.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(300, 500, 700);
    this.scene.add(sunLight);
  }

  private readonly resize = (): void => {
    const width = this.root.clientWidth || DEFAULT_WIDTH;
    const height = this.root.clientHeight || DEFAULT_HEIGHT;

    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private updateCamera(snapshot: GameSnapshot): void {
    const width = this.root.clientWidth || DEFAULT_WIDTH;
    const focusX = width / 2;

    this.camera.position.set(focusX, 260, 760);
    this.camera.lookAt(focusX, 80, 0);
  }

  private drawGround(): void {
    const width = this.root.clientWidth || DEFAULT_WIDTH;

    const ground = this.getBox("ground", 0x79b851);

    ground.scale.set(width * 2, GROUND_THICKNESS, GROUND_DEPTH);
    ground.position.set(width / 2, -GROUND_THICKNESS / 2, 0);
  }

  private drawEntities(snapshot: GameSnapshot): void {
    for (const entity of snapshot.entities) {
      const object = this.getBox(`entity:${entity.id}`, this.getEntityColor(entity.type, entity.alive));
      const depth = entity.type === "obstacle" ? 90 : 50;

      const x = entity.x - snapshot.world.scrollX + entity.width / 2;

      this.setGameBox(object, entity.width, entity.height, depth, x, entity.y, snapshot.world.groundY);
    }
  }

  private drawPlayers(snapshot: GameSnapshot, playerId: PlayerId | undefined): void {
    for (const player of snapshot.players) {
      const isLocal = player.playerId === playerId;
      const color = player.alive ? (isLocal ? 0xffcc33 : 0xf58ad4) : 0x555555;

      const object = this.getBox(`player:${player.playerId}`, color);
      const x = player.x + player.width / 2;

      this.setGameBox(object, player.width, player.height, 70, x, player.y, snapshot.world.groundY);
    }
  }

  private setGameBox(
    object: THREE.Mesh,
    width: number,
    height: number,
    depth: number,
    centerX: number,
    topY: number,
    groundY: number,
  ): void {
    const centerScreenY = topY + height / 2;
    const worldY = groundY - centerScreenY;

    object.scale.set(width, height, depth);
    object.position.set(centerX, worldY, 0);
  }

  private cleanup(snapshot: GameSnapshot): void {
    const activeKeys = new Set<string>(["ground"]);

    for (const entity of snapshot.entities) {
      activeKeys.add(`entity:${entity.id}`);
    }

    for (const player of snapshot.players) {
      activeKeys.add(`player:${player.playerId}`);
    }

    for (const [key, object] of this.objects) {
      if (activeKeys.has(key)) {
        continue;
      }

      this.disposeObject(object);
      this.objects.delete(key);
    }
  }

  private getBox(key: string, color: number): THREE.Mesh {
    const existing = this.objects.get(key);

    if (existing !== undefined) {
      this.setObjectColor(existing, color);
      return existing;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.08,
    });

    const object = new THREE.Mesh(geometry, material);

    this.scene.add(object);
    this.objects.set(key, object);

    return object;
  }

  private setObjectColor(object: THREE.Mesh, color: number): void {
    const material = object.material;

    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.setHex(color);
    }
  }

  private disposeObject(object: THREE.Mesh): void {
    this.scene.remove(object);
    object.geometry.dispose();

    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        material.dispose();
      }

      return;
    }

    object.material.dispose();
  }

  private getEntityColor(type: string, alive: boolean): number {
    if (!alive) {
      return 0x555555;
    }

    if (type === "obstacle") {
      return 0x1e7f3e;
    }

    if (type === "civilian") {
      return 0x4aa3df;
    }

    return 0x8b3a3a;
  }
}
