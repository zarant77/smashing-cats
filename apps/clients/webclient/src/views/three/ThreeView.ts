import * as THREE from "three";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Locale, Translator } from "@smashing-cats/i18n";
import type { GameView } from "../types.js";
import { Animation } from "./Animation.js";
import { CameraController, type CameraMode } from "./CameraController.js";
import { getEntityColor, getPlayerColor } from "./colors.js";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, GROUND_DEPTH, GROUND_THICKNESS } from "./constants.js";
import { getWorldY } from "./coordinates.js";
import { getEntityModelPath, getPlayerModelPath } from "./modelPaths.js";
import { ModelCache } from "./ModelCache.js";
import { type SceneObject, ObjectRegistry } from "./ObjectRegistry.js";

export class ThreeView implements GameView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new CameraController();
  private readonly models = new ModelCache();
  private readonly registry: ObjectRegistry;
  private readonly animation = new Animation();

  private t: Translator = (key) => key;

  public constructor(private readonly root: HTMLElement) {
    this.root.replaceChildren();

    this.scene.background = new THREE.Color(0x87ceeb);
    this.registry = new ObjectRegistry(this.scene);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.root.appendChild(this.renderer.domElement);

    this.setupLights();

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);

    this.resize();
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.resize();

    const width = this.root.clientWidth || DEFAULT_WIDTH;
    const height = this.root.clientHeight || DEFAULT_HEIGHT;

    this.camera.update(width, height);

    if (snapshot === undefined) {
      this.renderer.render(this.scene, this.camera.camera);
      return;
    }

    this.drawGround();
    this.drawEntities(snapshot);
    this.drawPlayers(snapshot, playerId);
    this.cleanup(snapshot);

    this.renderer.render(this.scene, this.camera.camera);
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.t = t;
  }

  public setCameraMode(mode: CameraMode): void {
    this.camera.setMode(mode);
  }

  public toggleCameraMode(): void {
    this.camera.toggle();
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);

    this.registry.disposeAll();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.45);
    sunLight.position.set(300, 500, 700);
    this.scene.add(sunLight);
  }

  private readonly resize = (): void => {
    const width = this.root.clientWidth || DEFAULT_WIDTH;
    const height = this.root.clientHeight || DEFAULT_HEIGHT;

    this.renderer.setSize(width, height, false);
    this.camera.resize(width, height);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "KeyC") {
      this.toggleCameraMode();
    }
  };

  private drawGround(): void {
    const width = this.root.clientWidth || DEFAULT_WIDTH;
    const object = this.registry.get("ground", 0x79b851);

    object.root.position.set(width / 2, -GROUND_THICKNESS / 2, 0);
    object.root.rotation.set(0, 0, 0);
    object.root.scale.set(1, 1, 1);

    object.fallback.scale.set(width * 2, GROUND_THICKNESS, GROUND_DEPTH);
  }

  private drawEntities(snapshot: GameSnapshot): void {
    for (const entity of snapshot.entities) {
      const color = getEntityColor(entity.type, entity.alive);
      const object = this.registry.get(`entity:${entity.id}`, color);
      const depth = entity.type === "obstacle" ? 90 : 50;
      const x = entity.x - snapshot.world.scrollX + entity.width / 2;

      this.setGameObjectSize(object, entity.width, entity.height, depth);

      if (entity.type === "obstacle") {
        object.root.position.set(x, getWorldY(entity.y, entity.height, snapshot.world.groundY), 0);
        object.root.rotation.set(0, 0, 0);
        object.root.scale.set(1, 1, 1);
      } else {
        this.animation.applyEntity(object, entity.id, x, entity.y, entity.width, entity.height, snapshot.world.groundY, entity.alive);
      }

      void this.registry.attachModel(object, getEntityModelPath(entity.type, entity.kind), (path) => this.models.load(path));
    }
  }

  private drawPlayers(snapshot: GameSnapshot, playerId: PlayerId | undefined): void {
    for (const player of snapshot.players) {
      const isLocal = player.playerId === playerId;
      const color = getPlayerColor(isLocal, player.alive);
      const object = this.registry.get(`player:${player.playerId}`, color);
      const x = player.x + player.width / 2;

      this.setGameObjectSize(object, player.width, player.height, 70);
      this.animation.applyPlayer(object, player, x, snapshot.world.groundY);

      void this.registry.attachModel(object, getPlayerModelPath(player.kind), (path) => this.models.load(path));
    }
  }

  private setGameObjectSize(object: SceneObject, width: number, height: number, depth: number): void {
    object.fallback.scale.set(width, height, depth);

    if (object.model === undefined) {
      return;
    }

    if (object.model.userData["fitted"] === true) {
      return;
    }

    this.registry.fitModelToBox(object.model, width, height, depth);
    object.model.userData["fitted"] = true;
  }

  private cleanup(snapshot: GameSnapshot): void {
    const activeKeys = new Set<string>(["ground"]);

    for (const entity of snapshot.entities) {
      activeKeys.add(`entity:${entity.id}`);
    }

    for (const player of snapshot.players) {
      activeKeys.add(`player:${player.playerId}`);
    }

    this.registry.cleanup(activeKeys);
  }
}
