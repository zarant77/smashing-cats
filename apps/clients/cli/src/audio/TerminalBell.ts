type BellPattern = {
  count: number;
  interval: number;
};

const PATTERNS = {
  ui: {
    count: 1,
    interval: 0,
  },

  move: {
    count: 1,
    interval: 0,
  },

  jump: {
    count: 2,
    interval: 30,
  },

  scoreUp: {
    count: 3,
    interval: 18,
  },

  scoreDown: {
    count: 2,
    interval: 80,
  },

  hpUp: {
    count: 2,
    interval: 25,
  },

  hpDown: {
    count: 4,
    interval: 20,
  },
} as const;

type BellSound = keyof typeof PATTERNS;

export class TerminalBell {
  private enabled = true;
  private lastBeepAt = 0;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public ui(): void {
    this.play("ui", 30);
  }

  public move(): void {
    this.play("move", 20);
  }

  public jump(): void {
    this.play("jump", 80);
  }

  public scoreUp(): void {
    this.play("scoreUp", 120);
  }

  public scoreDown(): void {
    this.play("scoreDown", 120);
  }

  public hpUp(): void {
    this.play("hpUp", 120);
  }

  public hpDown(): void {
    this.play("hpDown", 120);
  }

  private play(sound: BellSound, minIntervalMs: number): void {
    if (!this.enabled || !process.stdout.isTTY) {
      return;
    }

    const now = Date.now();

    if (now - this.lastBeepAt < minIntervalMs) {
      return;
    }

    this.lastBeepAt = now;

    const pattern = PATTERNS[sound];

    for (let i = 0; i < pattern.count; i++) {
      setTimeout(() => {
        process.stdout.write("\x07");
      }, i * pattern.interval);
    }
  }
}

export const terminalBell = new TerminalBell();
