import type { GameSnapshot } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

const KEN_REACTION_DURATION_MS = 2000;
const KEN_FINAL_REACTION_DURATION_MS = 5000;
const KEN_IDLE_TRIGGER_MS = 7000;
const KEN_SAME_PRIORITY_COOLDOWN_MS = 3000;

type KenSpeechPriority = "idle" | "jump" | "smash" | "kill" | "finish";

const KEN_SPEECH_PRIORITY: Record<KenSpeechPriority, number> = {
  idle: 0,
  jump: 1,
  smash: 2,
  kill: 3,
  finish: 4,
};

export type KenSpeech = {
  text: string;
  until: number;
  priority: KenSpeechPriority;
};

type TutorialProgress = {
  moved: boolean;
  jumped: boolean;
  smashed: boolean;
  killedTarget: boolean;
};

export class MasterKen {
  private wasTutorialActive = false;
  private wasOnGround = true;
  private wasSmashing = false;
  private smashedDuringAir = false;

  private previousPlayerX: number | undefined;
  private lastActionAt = 0;

  private readonly handledEventIds = new Set<string>();
  private readonly lastSpeechByPriority = new Map<KenSpeechPriority, number>();

  private speech: KenSpeech | undefined;

  public reset(now: number): void {
    this.wasTutorialActive = false;
    this.wasOnGround = true;
    this.wasSmashing = false;
    this.smashedDuringAir = false;
    this.previousPlayerX = undefined;
    this.lastActionAt = now;
    this.handledEventIds.clear();
    this.lastSpeechByPriority.clear();
    this.speech = undefined;
  }

  public update(snapshot: GameSnapshot, now: number): void {
    if (this.lastActionAt === 0) {
      this.lastActionAt = now;
    }

    const progress = this.getTutorialProgress(snapshot);

    if (progress.moved) {
      this.markPlayerAction(now);
    }

    if (progress.killedTarget && this.wasTutorialActive && !snapshot.tutorial.active) {
      this.markPlayerAction(now);
      this.say("kenFinalPhrase", "finish", now);
      this.wasTutorialActive = snapshot.tutorial.active;
      return;
    }

    if (this.wasTutorialActive && !snapshot.tutorial.active) {
      this.say("kenFinalPhrase", "finish", now);
      this.wasTutorialActive = snapshot.tutorial.active;
      return;
    }

    if (progress.killedTarget) {
      this.markPlayerAction(now);
      this.say("kenKillPhrase", "kill", now);
      this.wasTutorialActive = snapshot.tutorial.active;
      return;
    }

    if (progress.smashed) {
      this.markPlayerAction(now);
      this.say("kenSmashPhrase", "smash", now);
      this.wasTutorialActive = snapshot.tutorial.active;
      return;
    }

    if (progress.jumped) {
      this.markPlayerAction(now);
      this.say("kenJumpPhrase", "jump", now);
      this.wasTutorialActive = snapshot.tutorial.active;
      return;
    }

    this.updateIdleReaction(now);
    this.wasTutorialActive = snapshot.tutorial.active;
  }

  public getActiveSpeech(now: number): KenSpeech | undefined {
    if (this.speech === undefined) {
      return undefined;
    }

    if (now > this.speech.until) {
      this.speech = undefined;
      return undefined;
    }

    return this.speech;
  }

  private updateIdleReaction(now: number): void {
    if (now - this.lastActionAt < KEN_IDLE_TRIGGER_MS) {
      return;
    }

    this.say("kenIdlePhrase", "idle", now);
    this.markPlayerAction(now);
  }

  private say(key: string, priority: KenSpeechPriority, now: number): void {
    const activeSpeech = this.getActiveSpeech(now);

    if (activeSpeech !== undefined && KEN_SPEECH_PRIORITY[priority] <= KEN_SPEECH_PRIORITY[activeSpeech.priority]) {
      return;
    }

    if (priority !== "finish" && this.isPriorityOnCooldown(priority, now)) {
      return;
    }

    const duration = priority === "finish" ? KEN_FINAL_REACTION_DURATION_MS : KEN_REACTION_DURATION_MS;

    this.speech = {
      text: t(key),
      until: now + duration,
      priority,
    };

    this.lastSpeechByPriority.set(priority, now);
  }

  private isPriorityOnCooldown(priority: KenSpeechPriority, now: number): boolean {
    const lastSpeechAt = this.lastSpeechByPriority.get(priority);

    if (lastSpeechAt === undefined) {
      return false;
    }

    return now - lastSpeechAt < KEN_SAME_PRIORITY_COOLDOWN_MS;
  }

  private markPlayerAction(now: number): void {
    this.lastActionAt = now;
  }

  private getTutorialProgress(snapshot: GameSnapshot): TutorialProgress {
    const player = snapshot.players[0];

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

    const killedTarget = snapshot.events.some((event) => {
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
}
