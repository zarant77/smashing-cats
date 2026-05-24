import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import type { RenderViewport } from "../../viewport.js";

const CAMP_RIGHT_WORLD_X = 1050;
const DEPTH = 0;

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

  private wasTutorialActive = false;
  private wasOnGround = true;
  private wasSmashing = false;
  private smashedDuringAir = false;

  private previousPlayerX: number | undefined;
  private lastActionAt = performance.now();

  private handledEventIds = new Set<string>();
  private kenSpeech: KenSpeech | undefined;

  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly texts = new Map<string, Phaser.GameObjects.Text>();
  private readonly visibleIds = new Set<string>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.snapshot = snapshot;
    this.viewport = viewport;
    this.groundY = viewport.worldToScreenY(snapshot.world.groundY);
    this.visibleIds.clear();

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
    this.handledEventIds.clear();
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
      fontSize: 14,
      fontFamily: '"Comic Sans MS", cursive',
      fontStyle: "500",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
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

    if (!this.scene.textures.exists(key)) {
      this.scene.textures.addImage(key, source);
    }

    const width = source.naturalWidth * scale;
    const height = source.naturalHeight * scale;

    const x = this.worldObjectX(worldX) + (options?.offsetX ?? 0);
    const topY = this.groundY - height - y + (options?.offsetY ?? 0);

    const pivotX = options?.pivotX ?? width * 0.5;
    const pivotY = options?.pivotY ?? height;
    const scaleX = options?.scaleX ?? 1;
    const scaleY = options?.scaleY ?? 1;

    const image = this.getImage(id, key);

    image.setVisible(true);
    image.setDepth(DEPTH);
    image.setTexture(key);
    image.setOrigin(width === 0 ? 0 : pivotX / width, height === 0 ? 0 : pivotY / height);
    image.setPosition(Math.round(x + pivotX), Math.round(topY + pivotY));
    image.setDisplaySize(width * scaleX, height * scaleY);
    image.setRotation(options?.rotation ?? 0);
    image.setFlipX(options?.flip ?? false);
    image.setAlpha(1);

    this.visibleIds.add(id);
  }

  private drawText(id: string, text: string, worldX: number, y: number, options?: DrawTextOptions): void {
    const textObject = this.getText(id);
    const x = this.worldObjectX(worldX);
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
      wordWrap: { width: options?.maxWidth ?? 180, useAdvancedWrap: true },
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
