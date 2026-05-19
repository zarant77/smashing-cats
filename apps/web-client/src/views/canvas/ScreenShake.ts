import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

const SHAKE_DURATION_MS = 200;
const SHAKE_STRENGTH = 10;

export class ScreenShake {
  private readonly seenEventIds = new Set<string>();
  private shakeStartedAt = -Infinity;
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

  public getOffset(scale: number): { x: number; y: number } {
    const now = performance.now();
    const remaining = this.shakeUntil - now;

    if (remaining <= 0) {
      return { x: 0, y: 0 };
    }

    const elapsed = now - this.shakeStartedAt;
    const strength = SHAKE_STRENGTH * scale * (remaining / SHAKE_DURATION_MS);

    return {
      x: Math.sin(elapsed * 0.11) * strength,
      y: Math.sin(elapsed * 0.17 + Math.PI / 3) * strength,
    };
  }

  private shake(): void {
    this.shakeStartedAt = performance.now();
    this.shakeUntil = this.shakeStartedAt + SHAKE_DURATION_MS;
  }
}
