import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import { isSnapshotGameRunning } from "../../snapshotState.js";
import { MasterKen } from "../../../tutorial/MasterKen.js";
import type { RenderViewport } from "../../viewport.js";

const CAMP_RIGHT_WORLD_X = 1050;
const DEPTH = 0;

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
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  color?: string;
  align?: "left" | "center" | "right";
  rotation?: number;
  maxWidth?: number;
  lineHeight?: number;
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

  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly texts = new Map<string, Phaser.GameObjects.Text>();
  private readonly visibleIds = new Set<string>();

  public constructor(private readonly scene: Phaser.Scene) {}

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
    for (const image of this.images.values()) {
      image.destroy();
    }

    for (const text of this.texts.values()) {
      text.destroy();
    }

    this.images.clear();
    this.texts.clear();
  }

  private resetForRestartedTutorial(snapshot: GameSnapshot): void {
    const tickRestarted = this.lastTick !== undefined && snapshot.tick < this.lastTick;

    const tutorialRestarted =
      snapshot.tutorial.active && (!this.wasTutorialActive || tickRestarted) && this.campFinished;

    if (!tutorialRestarted) {
      return;
    }

    this.campVisible = false;
    this.campFinished = false;
    this.masterKen.reset(performance.now());
  }

  private drawCamp(now: number): void {
    this.drawImage("tower", "tutorial.tower", 50, 0, 1);
    this.drawImage("bag", "tutorial.bag", 700, 0, 1, { flip: true });

    this.drawKen(now);

    this.drawImage("crates", "tutorial.crates", 180, 0, 1);
    this.drawImage("signboard", "tutorial.signboard", 820, 0, 1);

    this.drawFlag(now);
    this.drawBanner(now);
    this.drawSchoolboard();
  }

  private drawSchoolboard(): void {
    this.drawImage("schoolboard", "tutorial.schoolboard", 350, 0, 1);

    this.drawText("schoolboard-text", t("tutorialText"), 480, 150, {
      fontSize: 14,
      fontFamily: '"Comic Sans MS", cursive',
      fontStyle: "500",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
    });
  }

  private drawFlag(now: number): void {
    const wave = Math.sin(now * 0.002) * 0.04;

    this.drawImage("flag", "tutorial.flag", 177, 363, 1, {
      rotation: wave,
      pivotX: 0,
      pivotY: 0,
    });
  }

  private drawBanner(now: number): void {
    const swing = Math.sin(now * 0.0025) * 0.035;

    this.drawImage("banner", "tutorial.banner", 120, 110, 1, {
      rotation: swing,
      pivotX: 25,
      pivotY: 0,
    });
  }

  private drawKen(now: number): void {
    const breathe = Math.sin(now * 0.004) * 0.005;
    const swing = Math.sin(now * 0.0025) * 0.005;

    const speech = this.masterKen.getActiveSpeech(now);
    const frame = speech === undefined ? "tutorial.ken1" : "tutorial.ken2";

    this.drawImage("ken", frame, 230, 142, 0.5, {
      rotation: swing,
      scaleX: 1 + breathe,
      scaleY: 1 - breathe,
      pivotX: 64,
      pivotY: 118,
    });

    if (speech !== undefined) {
      this.drawSpeech(speech.text, 290, 210);
    }
  }

  private drawSpeech(text: string, worldX: number, y: number): void {
    this.drawImage("speech-bubble", "common.speech_bubble", worldX, y, 1);

    this.drawText("speech-text", text, worldX + 200, y + 100, {
      fontSize: 18,
      fontFamily: "Arial",
      fontStyle: "700",
      color: "#2a1b12",
      align: "center",
      rotation: -0.15,
      maxWidth: 180,
      lineHeight: 24,
    });
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

    if (!this.scene.textures.exists(key)) {
      this.scene.textures.addImage(key, source);
    }

    const height = source.naturalHeight * scale;
    const x = worldX + (options?.offsetX ?? 0);
    const topY = this.groundY - height - y + (options?.offsetY ?? 0);
    const pivotX = options?.pivotX ?? source.naturalWidth * 0.5;
    const pivotY = options?.pivotY ?? source.naturalHeight;
    const scaleX = options?.scaleX ?? 1;
    const scaleY = options?.scaleY ?? 1;
    const image = this.getImage(id, key);

    image.setVisible(true);
    image.setDepth(DEPTH);
    image.setTexture(key);
    image.setOrigin(pivotX / source.naturalWidth, pivotY / source.naturalHeight);
    image.setPosition(Math.round(x + pivotX * scale), Math.round(topY + pivotY * scale));
    image.setScale((options?.flip ? -1 : 1) * scale * scaleX, scale * scaleY);
    image.setRotation(options?.rotation ?? 0);
    image.setFlipX(false);
    image.setAlpha(1);
    this.visibleIds.add(id);
  }

  private drawText(id: string, text: string, x: number, y: number, options?: DrawTextOptions): void {
    const textObject = this.getText(id);
    const drawY = this.groundY - y;

    textObject.setVisible(true);
    textObject.setDepth(DEPTH + 1);
    textObject.setText(text);
    textObject.setPosition(Math.round(x), Math.round(drawY));
    textObject.setOrigin(options?.align === "center" ? 0.5 : 0, 0.5);
    textObject.setRotation(options?.rotation ?? 0);
    textObject.setStyle({
      color: options?.color ?? "#111111",
      fontFamily: options?.fontFamily ?? "Arial",
      fontSize: `${options?.fontSize ?? 24}px`,
      fontStyle: options?.fontStyle ?? "700",
      align: options?.align ?? "left",
      wordWrap: {
        width: options?.maxWidth ?? 180,
        useAdvancedWrap: true,
      },
    });
    textObject.setLineSpacing((options?.lineHeight ?? 28) - (options?.fontSize ?? 24));

    this.visibleIds.add(id);
  }

  private getImage(id: string, key: string): Phaser.GameObjects.Image {
    const existing = this.images.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const image = this.scene.add.image(0, 0, key);

    image.setVisible(false);
    image.setDepth(DEPTH);

    this.images.set(id, image);

    return image;
  }

  private getText(id: string): Phaser.GameObjects.Text {
    const existing = this.texts.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const text = this.scene.add.text(0, 0, "");

    text.setVisible(false);
    text.setDepth(DEPTH + 1);

    this.texts.set(id, text);

    return text;
  }

  private hideUnusedObjects(): void {
    for (const [id, image] of this.images) {
      image.setVisible(this.visibleIds.has(id));
    }

    for (const [id, text] of this.texts) {
      text.setVisible(this.visibleIds.has(id));
    }
  }

  private worldObjectX(worldX: number): number {
    return this.viewport.worldToScreenX(worldX);
  }

  private isCampOutsideScreen(): boolean {
    return this.worldObjectX(CAMP_RIGHT_WORLD_X) < 0;
  }
}
