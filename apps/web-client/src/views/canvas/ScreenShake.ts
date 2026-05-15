import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

const SHAKE_DURATION_MS = 200;
const SHAKE_STRENGTH = 10;

export class ScreenShake {
  private readonly seenEventIds = new Set<string>();
  private shakeUntil = 0;
  private wasSmashing = false;

  public update(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    if (snapshot === undefined) {
      return;
    }

    const localPlayer = snapshot.players.find((player) => player.playerId === localPlayerId);
    const isSmashing = localPlayer?.smashing ?? false;

    if (isSmashing && !this.wasSmashing) {
      this.shake();
    }

    this.wasSmashing = isSmashing;

    for (const event of snapshot.events) {
      if (this.seenEventIds.has(event.id)) {
        continue;
      }

      this.seenEventIds.add(event.id);

      if (event.type === "enemyKilled" || event.type === "civilianKilled") {
        this.shake();
      }
    }

    if (this.seenEventIds.size > 200) {
      this.seenEventIds.clear();
    }
  }

  private shake(): void {
    this.shakeUntil = performance.now() + SHAKE_DURATION_MS;
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
