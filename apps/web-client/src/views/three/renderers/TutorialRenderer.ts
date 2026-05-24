import * as THREE from "three";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import { getImageAsset, getModelAsset, images, models as modelCache } from "../../../assetManager/assetManager.js";
import { isSnapshotGameRunning } from "../../snapshotState.js";
import { MasterKen } from "../../../tutorial/MasterKen.js";
import type { RenderViewport } from "../../viewport.js";

const CAMP_RIGHT_WORLD_X = 1050;
const Z = 240;
const RENDER_ORDER = 0;

type DrawImageOptions = {
  flip?: boolean;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
};

type DrawModelOptions = {
  flip?: boolean;
  rotationY?: number;
  rotationZ?: number;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
};

type DrawTextOptions = {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  rotation?: number;
  maxWidth?: number;
  lineHeight?: number;
  preserveNewlines?: boolean;
};

type TextState = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  lastText: string;
  lastStyle: string;
};

type ModelState = {
  key: string;
  group: THREE.Group;
  baseSize: THREE.Vector3;
};

export class TutorialRenderer {
  private snapshot!: GameSnapshot;
  private viewport!: RenderViewport;
  private groundY = 0;

  private campVisible = false;
  private campFinished = false;

  private lastTick: number | undefined;
  private wasTutorialActive = false;

  private readonly masterKen = new MasterKen();

  private readonly textures = new Map<string, THREE.Texture>();
  private readonly images = new Map<string, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>();
  private readonly texts = new Map<string, TextState>();
  private readonly models = new Map<string, ModelState>();
  private readonly visibleIds = new Set<string>();

  public constructor(private readonly scene: THREE.Scene) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.snapshot = snapshot;
    this.viewport = viewport;
    this.groundY = viewport.worldToScreenY(snapshot.world.groundY);
    this.visibleIds.clear();
    this.resetForRestartedTutorial(snapshot);

    if (!isSnapshotGameRunning(snapshot)) {
      this.hideUnusedObjects();
      this.wasTutorialActive = snapshot.tutorial.active;
      this.lastTick = snapshot.tick;
      return;
    }

    if (snapshot.tutorial.active || snapshot.tutorial.completed) {
      this.campVisible = true;
    }

    if (this.campVisible && !this.campFinished) {
      const now = performance.now();

      this.masterKen.update(snapshot, now);
      this.drawCamp(now);

      if (!snapshot.tutorial.active && this.isCampOutsideScreen()) {
        this.campFinished = true;
      }
    }

    this.hideUnusedObjects();
    this.wasTutorialActive = snapshot.tutorial.active;
    this.lastTick = snapshot.tick;
  }

  public destroy(): void {
    for (const mesh of this.images.values()) {
      this.disposePlaneMesh(mesh);
    }

    for (const state of this.texts.values()) {
      this.disposePlaneMesh(state.mesh);
      state.texture.dispose();
    }

    for (const state of this.models.values()) {
      this.scene.remove(state.group);
    }

    for (const texture of this.textures.values()) {
      texture.dispose();
    }

    this.images.clear();
    this.texts.clear();
    this.models.clear();
    this.textures.clear();
  }

  private resetForRestartedTutorial(snapshot: GameSnapshot): void {
    const tickRestarted = this.lastTick !== undefined && snapshot.tick < this.lastTick;
    const tutorialRestarted =
      (tickRestarted && (snapshot.tutorial.active || snapshot.tutorial.completed)) ||
      (this.campFinished && snapshot.tutorial.active && !this.wasTutorialActive);

    if (!tutorialRestarted) {
      return;
    }

    this.campVisible = false;
    this.campFinished = false;
    this.masterKen.reset(performance.now());
  }

  private drawCamp(now: number): void {
    this.drawModel("tower", "tutorial.tower", 50, 0, 400);
    this.drawModel("bag", "tutorial.bag", 700, 0, 220, { flip: true });
    this.drawKen(now);

    this.drawModel("crates", "tutorial.crates", 180, 0, 150);
    this.drawModel("signboard", "tutorial.signboard", 820, 0, 170);

    this.drawFlag(now);
    this.drawBanner(now);
    this.drawSchoolboard();
  }

  private drawSchoolboard(): void {
    this.drawModel("schoolboard", "tutorial.schoolboard", 350, 0, 180);

    this.drawText("schoolboard-text", t("tutorialText"), 480, 150, {
      font: "500 14px 'Comic Sans MS', cursive",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
      preserveNewlines: true,
    });
  }

  private drawFlag(now: number): void {
    const wave = Math.sin(now * 0.002) * 0.04;

    this.drawImage("flag", "tutorial.flag", 177, 363, 0.5, {
      rotation: wave,
    });
  }

  private drawBanner(now: number): void {
    const swing = Math.sin(now * 0.0025) * 0.035;

    this.drawImage("banner", "tutorial.banner", 120, 110, 0.5, {
      rotation: swing,
    });
  }

  private drawKen(now: number): void {
    const breathe = Math.sin(now * 0.004) * 0.005;
    const swing = Math.sin(now * 0.0025) * 0.005;
    const speech = this.masterKen.getActiveSpeech(now);

    this.drawModel("ken", "tutorial.ken", 230, 142, 128, {
      rotationZ: swing,
      scaleX: 1 + breathe,
      scaleY: 1 - breathe,
    });

    if (speech !== undefined) {
      this.drawSpeech(speech.text, 290, 210);
    }
  }

  private drawSpeech(text: string, worldX: number, y: number): void {
    this.drawImage("speech-bubble", "common.speech_bubble", worldX, y, 0.25);

    this.drawText("speech-text", text, worldX + 200, y + 100, {
      font: "700 18px Arial",
      color: "#2a1b12",
      align: "center",
      rotation: -0.15,
      maxWidth: 180,
      lineHeight: 24,
      preserveNewlines: true,
    });
  }

  private drawModel(
    id: string,
    key: string,
    worldX: number,
    y: number,
    height: number,
    options?: DrawModelOptions,
  ): void {
    const state = this.getModelState(id, key);
    const baseHeight = Math.max(1, state.baseSize.y);
    const scale = height / baseHeight;

    const group = state.group;
    const x = this.worldObjectX(worldX) + (options?.offsetX ?? 0);
    const feetY = this.groundY - y + (options?.offsetY ?? 0);

    group.visible = true;
    group.rotation.set(0, options?.rotationY ?? 0, options?.rotationZ ?? 0);
    group.scale.set(
      (options?.flip === true ? -1 : 1) * scale * (options?.scaleX ?? 1),
      -scale * (options?.scaleY ?? 1),
      scale * (options?.scaleZ ?? 1),
    );

    group.position.set(0, 0, Z);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();

    box.getCenter(center);

    group.position.x += Math.round(x - center.x);
    group.position.y += Math.round(feetY - box.max.y);
    group.position.z += Z - center.z;
    group.updateMatrixWorld(true);

    this.visibleIds.add(id);
  }

  private drawImage(
    id: string,
    key: string,
    worldX: number,
    y: number,
    scale: number,
    options?: DrawImageOptions,
  ): void {
    const source = images.getLoaded(getImageAsset(key));

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return;
    }

    const width = source.naturalWidth * scale;
    const height = source.naturalHeight * scale;
    const x = this.worldObjectX(worldX) + (options?.offsetX ?? 0);
    const topY = this.groundY - height - y + (options?.offsetY ?? 0);
    const scaleX = options?.scaleX ?? 1;
    const scaleY = options?.scaleY ?? 1;
    const mesh = this.getImageMesh(id, key, source);

    mesh.visible = true;
    mesh.position.set(Math.round(x + width / 2), Math.round(topY + height / 2), Z + 20);
    mesh.scale.set((options?.flip === true ? -1 : 1) * width * scaleX, -height * scaleY, 1);
    mesh.rotation.set(0, 0, options?.rotation ?? 0);
    mesh.material.opacity = 1;

    this.visibleIds.add(id);
  }

  private drawText(id: string, text: string, worldX: number, y: number, options?: DrawTextOptions): void {
    const state = this.getTextState(id);
    const font = options?.font ?? "700 24px Arial";
    const color = options?.color ?? "#111111";
    const align = options?.align ?? "left";
    const maxWidth = options?.maxWidth ?? 180;
    const lineHeight = options?.lineHeight ?? 28;
    const styleKey = `${font}:${color}:${align}:${maxWidth}:${lineHeight}:${options?.preserveNewlines ?? false}`;

    if (state.lastText !== text || state.lastStyle !== styleKey) {
      this.renderTextTexture(state, text, { ...options, font, color, align, maxWidth, lineHeight });
      state.lastText = text;
      state.lastStyle = styleKey;
    }

    const x = this.worldObjectX(worldX);
    const drawY = this.groundY - y;

    state.mesh.visible = true;
    state.mesh.position.set(Math.round(x), Math.round(drawY), Z + 21);
    state.mesh.scale.set(state.canvas.width, -state.canvas.height, 1);
    state.mesh.rotation.set(0, 0, options?.rotation ?? 0);

    this.visibleIds.add(id);
  }

  private getModelState(id: string, key: string): ModelState {
    const existing = this.models.get(id);

    if (existing !== undefined && existing.key === key) {
      return existing;
    }

    if (existing !== undefined) {
      this.scene.remove(existing.group);
      this.models.delete(id);
    }

    const source = modelCache.getLoaded(getModelAsset(key));
    const group = source.clone(true);

    group.traverse((object) => {
      object.frustumCulled = false;

      if (object instanceof THREE.Mesh) {
        object.renderOrder = RENDER_ORDER;
      }
    });

    group.visible = false;

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const baseSize = new THREE.Vector3();

    box.getSize(baseSize);

    const state: ModelState = {
      key,
      group,
      baseSize,
    };

    this.models.set(id, state);

    return state;
  }

  private getImageMesh(
    id: string,
    key: string,
    source: HTMLImageElement,
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const existing = this.images.get(id);

    if (existing !== undefined) {
      existing.material.map = this.getTexture(key, source);
      existing.material.needsUpdate = true;
      return existing;
    }

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.getTexture(key, source),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    mesh.renderOrder = RENDER_ORDER;
    mesh.frustumCulled = false;
    mesh.visible = false;

    this.scene.add(mesh);
    this.images.set(id, mesh);

    return mesh;
  }

  private getTexture(key: string, source: HTMLImageElement): THREE.Texture {
    const existing = this.textures.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const texture = new THREE.Texture(source);

    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;

    this.textures.set(key, texture);

    return texture;
  }

  private getTextState(id: string): TextState {
    const existing = this.texts.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("Tutorial text canvas context is unavailable");
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    mesh.renderOrder = RENDER_ORDER + 1;
    mesh.frustumCulled = false;
    mesh.visible = false;

    const state: TextState = {
      canvas,
      context,
      texture,
      mesh,
      lastText: "",
      lastStyle: "",
    };

    this.scene.add(mesh);
    this.texts.set(id, state);

    return state;
  }

  private renderTextTexture(state: TextState, text: string, options: DrawTextOptions): void {
    const ctx = state.context;
    const font = options.font ?? "700 24px Arial";
    const maxWidth = options.maxWidth ?? 180;
    const lineHeight = options.lineHeight ?? 28;

    ctx.font = font;

    const lines = this.getTextLines(ctx, text, maxWidth, options.preserveNewlines ?? false);
    const width = Math.max(1, Math.ceil(maxWidth));
    const height = Math.max(1, Math.ceil(lines.length * lineHeight));

    state.canvas.width = width;
    state.canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = options.color ?? "#111111";
    ctx.textAlign = options.align ?? "left";
    ctx.textBaseline = "middle";

    const x = options.align === "center" ? width / 2 : options.align === "right" ? width : 0;

    lines.forEach((line, index) => {
      ctx.fillText(line, x, lineHeight / 2 + index * lineHeight);
    });

    state.texture.needsUpdate = true;
  }

  private getTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    preserveNewlines: boolean,
  ): string[] {
    if (!preserveNewlines) {
      return this.wrapText(ctx, text, maxWidth);
    }

    return text.split("\n").flatMap((line) => {
      if (line.trim().length === 0) {
        return [""];
      }

      return this.wrapText(ctx, line, maxWidth);
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const test = current.length > 0 ? `${current} ${word}` : word;
      const width = ctx.measureText(test).width;

      if (width > maxWidth && current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }

    return lines;
  }

  private hideUnusedObjects(): void {
    for (const [id, mesh] of this.images) {
      mesh.visible = this.visibleIds.has(id);
    }

    for (const [id, state] of this.texts) {
      state.mesh.visible = this.visibleIds.has(id);
    }

    for (const [id, state] of this.models) {
      state.group.visible = this.visibleIds.has(id);
    }
  }

  private worldObjectX(worldX: number): number {
    return this.viewport.worldToScreenX(worldX);
  }

  private isCampOutsideScreen(): boolean {
    return this.worldObjectX(CAMP_RIGHT_WORLD_X) < 0;
  }

  private disposePlaneMesh(mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>): void {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
}
