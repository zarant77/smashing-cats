import * as THREE from "three";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import { isSnapshotGameRunning } from "../../snapshotState.js";
import type { RenderViewport } from "../../viewport.js";

const CAMP_RIGHT_WORLD_X = 1050;
const Z = 240;
const RENDER_ORDER = 0;

const KEN_REACTION_DURATION_MS = 2000;
const KEN_IDLE_TRIGGER_MS = 7000;

type KenSpeechPriority = "idle" | "jump" | "smash" | "kill" | "finish";

const KEN_SPEECH_PRIORITY: Record<KenSpeechPriority, number> = {
  idle: 0,
  jump: 1,
  smash: 2,
  kill: 3,
  finish: 4,
};

type KenSpeech = {
  text: string;
  until: number;
  priority: KenSpeechPriority;
};

type DrawImageOptions = {
  flip?: boolean;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
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

export class TutorialRenderer {
  private snapshot!: GameSnapshot;
  private viewport!: RenderViewport;
  private groundY = 0;

  private campVisible = false;
  private campFinished = false;

  private lastTick: number | undefined;
  private wasTutorialActive = false;
  private wasOnGround = true;
  private wasSmashing = false;
  private smashedDuringAir = false;

  private previousPlayerX: number | undefined;
  private lastActionAt = performance.now();

  private handledEventIds = new Set<string>();
  private kenSpeech: KenSpeech | undefined;

  private readonly textures = new Map<string, THREE.Texture>();
  private readonly images = new Map<string, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>();
  private readonly texts = new Map<string, TextState>();
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

    if (snapshot.tutorial.active) {
      this.campVisible = true;
    }

    if (this.campVisible && !this.campFinished) {
      this.updateKenReaction();
      this.drawCamp();

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
      this.disposeMesh(mesh);
    }

    for (const state of this.texts.values()) {
      this.disposeMesh(state.mesh);
      state.texture.dispose();
    }

    for (const texture of this.textures.values()) {
      texture.dispose();
    }

    this.images.clear();
    this.texts.clear();
    this.textures.clear();
    this.handledEventIds.clear();
  }

  private resetForRestartedTutorial(snapshot: GameSnapshot): void {
    const tickRestarted = this.lastTick !== undefined && snapshot.tick < this.lastTick;
    const tutorialRestarted = snapshot.tutorial.active && (!this.wasTutorialActive || tickRestarted) && this.campFinished;

    if (!tutorialRestarted) {
      return;
    }

    this.campVisible = false;
    this.campFinished = false;
    this.wasOnGround = true;
    this.wasSmashing = false;
    this.smashedDuringAir = false;
    this.previousPlayerX = undefined;
    this.lastActionAt = performance.now();
    this.handledEventIds.clear();
    this.kenSpeech = undefined;
  }

  private drawCamp(): void {
    this.drawImage("tower", "tutorial.tower", 50, 0, 0.5);
    this.drawImage("bag", "tutorial.bag", 700, 0, 0.3, { flip: true });

    this.drawKen();

    this.drawImage("crates", "tutorial.crates", 180, 0, 0.3);
    this.drawImage("signboard", "tutorial.signboard", 820, 0, 0.6);

    this.drawFlag();
    this.drawBanner();
    this.drawSchoolboard();
  }

  private drawSchoolboard(): void {
    this.drawImage("schoolboard", "tutorial.schoolboard", 350, 0, 0.22);

    this.drawText("schoolboard-text", t("tutorialText"), 480, 150, {
      font: "500 14px 'Comic Sans MS', cursive",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
      preserveNewlines: true,
    });
  }

  private drawFlag(): void {
    const wave = Math.sin(performance.now() * 0.002) * 0.04;

    this.drawImage("flag", "tutorial.flag", 177, 363, 0.5, {
      rotation: wave,
      pivotX: 0,
      pivotY: 0,
    });
  }

  private drawBanner(): void {
    const swing = Math.sin(performance.now() * 0.0025) * 0.035;

    this.drawImage("banner", "tutorial.banner", 120, 110, 0.5, {
      rotation: swing,
      pivotX: 25,
      pivotY: 0,
    });
  }

  private drawKen(): void {
    const now = performance.now();

    const breathe = Math.sin(now * 0.004) * 0.005;
    const swing = Math.sin(now * 0.0025) * 0.005;

    const speech = this.getActiveKenSpeech();
    const frame = speech === undefined ? "tutorial.ken1" : "tutorial.ken2";

    this.drawImage("ken", frame, 230, 142, 0.15, {
      rotation: swing,
      scaleX: 1 + breathe,
      scaleY: 1 - breathe,
      pivotX: 90,
      pivotY: 180,
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

  private updateKenReaction(): void {
    const progress = this.getTutorialProgress();

    if (progress.moved) {
      this.markPlayerAction();
    }

    if (this.wasTutorialActive && !this.snapshot.tutorial.active) {
      this.sayKenPhrase("kenFinalPhrase", "finish");
      return;
    }

    if (progress.killedTarget) {
      this.markPlayerAction();
      this.sayKenPhrase("kenKillPhrase", "kill");
      return;
    }

    if (progress.smashed) {
      this.markPlayerAction();
      this.sayKenPhrase("kenSmashPhrase", "smash");
      return;
    }

    if (progress.jumped) {
      this.markPlayerAction();
      this.sayKenPhrase("kenJumpPhrase", "jump");
      return;
    }

    this.updateKenIdleReaction();
  }

  private updateKenIdleReaction(): void {
    const now = performance.now();

    if (now - this.lastActionAt < KEN_IDLE_TRIGGER_MS) {
      return;
    }

    this.sayKenPhrase("kenIdlePhrase", "idle");
    this.markPlayerAction();
  }

  private markPlayerAction(): void {
    this.lastActionAt = performance.now();
  }

  private sayKenPhrase(key: string, priority: KenSpeechPriority): void {
    const activeSpeech = this.getActiveKenSpeech();

    if (activeSpeech !== undefined && KEN_SPEECH_PRIORITY[priority] <= KEN_SPEECH_PRIORITY[activeSpeech.priority]) {
      return;
    }

    this.kenSpeech = {
      text: t(key),
      until: performance.now() + KEN_REACTION_DURATION_MS,
      priority,
    };
  }

  private getActiveKenSpeech(): KenSpeech | undefined {
    if (this.kenSpeech === undefined) {
      return undefined;
    }

    if (performance.now() > this.kenSpeech.until) {
      this.kenSpeech = undefined;
      return undefined;
    }

    return this.kenSpeech;
  }

  private getTutorialProgress(): {
    moved: boolean;
    jumped: boolean;
    smashed: boolean;
    killedTarget: boolean;
  } {
    const player = this.snapshot.players[0];

    if (player === undefined) {
      return {
        moved: false,
        jumped: false,
        smashed: false,
        killedTarget: false,
      };
    }

    const moved = this.previousPlayerX !== undefined && Math.abs(player.x - this.previousPlayerX) > 0.1;
    const smashed = !this.wasSmashing && player.smashing;

    if (!player.grounded && player.smashing) {
      this.smashedDuringAir = true;
    }

    const landed = !this.wasOnGround && player.grounded;
    const jumped = landed && !this.smashedDuringAir;

    const killedTarget = this.snapshot.events.some((event) => {
      if (this.handledEventIds.has(event.id)) {
        return false;
      }

      this.handledEventIds.add(event.id);

      return event.type === "enemyKilled";
    });

    if (landed) {
      this.smashedDuringAir = false;
    }

    this.previousPlayerX = player.x;
    this.wasOnGround = player.grounded;
    this.wasSmashing = player.smashing;

    return {
      moved,
      jumped,
      smashed,
      killedTarget,
    };
  }

  private drawImage(id: string, key: string, worldX: number, y: number, scale: number, options?: DrawImageOptions): void {
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
    mesh.position.set(Math.round(x + width / 2), Math.round(topY + height / 2), Z);
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
      this.renderTextTexture(state, text, {
        ...options,
        font,
        color,
        align,
        maxWidth,
        lineHeight,
      });

      state.lastText = text;
      state.lastStyle = styleKey;
    }

    const x = this.worldObjectX(worldX);
    const drawY = this.groundY - y;

    state.mesh.visible = true;
    state.mesh.position.set(Math.round(x), Math.round(drawY), Z + 1);
    state.mesh.scale.set(state.canvas.width, -state.canvas.height, 1);
    state.mesh.rotation.set(0, 0, options?.rotation ?? 0);

    this.visibleIds.add(id);
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
  }

  private worldObjectX(worldX: number): number {
    return this.viewport.worldToScreenX(worldX);
  }

  private isCampOutsideScreen(): boolean {
    return this.worldObjectX(CAMP_RIGHT_WORLD_X) < 0;
  }

  private disposeMesh(mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>): void {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
}
