import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import type { RenderViewport } from "../viewport.js";
import { RenderHelper } from "./RenderHelper.js";

const CAMP_RIGHT_WORLD_X = 1050;

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

export class TutorialRenderer {
  private ctx!: CanvasRenderingContext2D;
  private snapshot!: GameSnapshot;

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

  private readonly helpers = new RenderHelper({
    getGroundY: () => this.groundY,
    worldObjectX: (worldX) => this.worldObjectX(worldX),
  });

  public draw(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.ctx = ctx;
    this.snapshot = snapshot;

    this.groundY = viewport.worldToScreenY(snapshot.world.groundY);

    if (snapshot.tutorial.active) {
      this.campVisible = true;
    }

    if (!this.campVisible || this.campFinished) {
      return;
    }

    this.updateKenReaction();
    this.drawCamp();

    if (!snapshot.tutorial.active && this.isCampOutsideScreen()) {
      this.campFinished = true;
    }

    this.wasTutorialActive = snapshot.tutorial.active;
  }

  private drawCamp(): void {
    this.helpers.img(this.ctx, "tutorial.tower", 50, 0, 1);
    this.helpers.img(this.ctx, "tutorial.bag", 700, 0, 1);

    this.drawKen();

    this.helpers.img(this.ctx, "tutorial.crates", 180, 0, 1);
    this.helpers.img(this.ctx, "tutorial.signboard", 820, 0, 1);

    this.drawFlag();
    this.drawBanner();
    this.drawSchoolboard();
  }

  private drawSchoolboard(): void {
    this.helpers.img(this.ctx, "tutorial.schoolboard", 350, 0, 1);

    const text = t("tutorialText");

    this.helpers.text(this.ctx, text, 480, 150, {
      font: "500 14px 'Comic Sans MS', cursive",
      color: "#ffffff",
      align: "center",
      maxWidth: 220,
      lineHeight: 20,
      rotation: 0,
      preserveNewlines: true,
    });
  }

  private drawFlag(): void {
    const wave = Math.sin(performance.now() * 0.002) * 0.04;

    this.helpers.img(this.ctx, "tutorial.flag", 177, 363, 1, {
      rotation: wave,
      pivotX: 0,
      pivotY: 0,
    });
  }

  private drawBanner(): void {
    const swing = Math.sin(performance.now() * 0.0025) * 0.035;

    this.helpers.img(this.ctx, "tutorial.banner", 120, 110, 1, {
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

  private worldObjectX(worldX: number): number {
    return worldX - this.snapshot.world.scrollX;
  }

  private isCampOutsideScreen(): boolean {
    return this.worldObjectX(CAMP_RIGHT_WORLD_X) < 0;
  }
}
