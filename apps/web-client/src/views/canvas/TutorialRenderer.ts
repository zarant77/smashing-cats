import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import type { RenderViewport } from "../viewport.js";
import { isSnapshotGameRunning } from "../snapshotState.js";
import { MasterKen } from "../../tutorial/MasterKen.js";
import { RenderHelper } from "./RenderHelper.js";

const CAMP_RIGHT_WORLD_X = 1050;

export class TutorialRenderer {
  private ctx!: CanvasRenderingContext2D;
  private snapshot!: GameSnapshot;
  private groundY = 0;
  private campVisible = false;
  private campFinished = false;
  private lastTick: number | undefined;
  private wasTutorialActive = false;

  private readonly masterKen = new MasterKen();

  private readonly helpers = new RenderHelper({
    getGroundY: () => this.groundY,
    worldObjectX: (worldX) => this.worldObjectX(worldX),
  });

  public draw(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.ctx = ctx;
    this.snapshot = snapshot;

    this.groundY = viewport.worldToScreenY(snapshot.world.groundY);

    this.resetForRestartedTutorial(snapshot);

    if (!isSnapshotGameRunning(snapshot)) {
      this.wasTutorialActive = snapshot.tutorial.active;
      this.lastTick = snapshot.tick;
      return;
    }

    if (snapshot.tutorial.active || snapshot.tutorial.completed) {
      this.campVisible = true;
    }

    if (!this.campVisible || this.campFinished) {
      this.wasTutorialActive = snapshot.tutorial.active;
      this.lastTick = snapshot.tick;
      return;
    }

    const now = performance.now();

    this.masterKen.update(snapshot, now);
    this.drawCamp(now);

    if (!snapshot.tutorial.active && this.isCampOutsideScreen()) {
      this.campFinished = true;
    }

    this.wasTutorialActive = snapshot.tutorial.active;
    this.lastTick = snapshot.tick;
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
    this.helpers.img(this.ctx, "tutorial.tower", 50, 0, 1);
    this.helpers.img(this.ctx, "tutorial.bag", 700, 0, 1);

    this.drawKen(now);

    this.helpers.img(this.ctx, "tutorial.crates", 180, 0, 1);
    this.helpers.img(this.ctx, "tutorial.signboard", 820, 0, 1);

    this.drawFlag(now);
    this.drawBanner(now);
    this.drawSchoolboard();
  }

  private drawSchoolboard(): void {
    this.helpers.img(this.ctx, "tutorial.schoolboard", 350, 0, 1);

    this.helpers.text(this.ctx, t("tutorialText"), 480, 150, {
      font: "500 16px 'Comic Sans MS', cursive",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
      rotation: 0,
      preserveNewlines: true,
    });
  }

  private drawFlag(now: number): void {
    const wave = Math.sin(now * 0.002) * 0.04;

    this.helpers.img(this.ctx, "tutorial.flag", 177, 363, 1, {
      rotation: wave,
      pivotX: 0,
      pivotY: 0,
    });
  }

  private drawBanner(now: number): void {
    const swing = Math.sin(now * 0.0025) * 0.035;

    this.helpers.img(this.ctx, "tutorial.banner", 120, 110, 1, {
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

    this.helpers.img(this.ctx, frame, 230, 142, 0.5, {
      rotation: swing,
      scaleX: 1 + breathe,
      scaleY: 1 - breathe,
      pivotX: 90,
      pivotY: 180,
    });

    if (speech !== undefined) {
      this.helpers.speech(this.ctx, speech.text, 290, 210);
    }
  }

  private worldObjectX(worldX: number): number {
    return worldX - this.snapshot.world.scrollX;
  }

  private isCampOutsideScreen(): boolean {
    return this.worldObjectX(CAMP_RIGHT_WORLD_X) < 0;
  }
}
