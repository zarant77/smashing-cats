import type { GameSnapshot } from "@smashing-cats/protocol";

const SHAKE_DURATION_MS = 180;
const SHAKE_STRENGTH = 5;

export class ScreenShake {
  private readonly seenEventIds = new Set<string>();
  private shakeUntil = 0;

  public update(snapshot: GameSnapshot | undefined): void {
    if (snapshot === undefined) {
      return;
    }

    for (const event of snapshot.events) {
      if (this.seenEventIds.has(event.id)) {
        continue;
      }

      this.seenEventIds.add(event.id);

      if (event.type === "enemyKilled" || event.type === "civilianKilled") {
        this.shakeUntil = performance.now() + SHAKE_DURATION_MS;
      }
    }

    if (this.seenEventIds.size > 200) {
      this.seenEventIds.clear();
    }
  }

  public getOffset(): { x: number; y: number } {
    const remaining = this.shakeUntil - performance.now();

    if (remaining <= 0) {
      return { x: 0, y: 0 };
    }

    const strength = SHAKE_STRENGTH * (remaining / SHAKE_DURATION_MS);

    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength,
    };
  }
}
