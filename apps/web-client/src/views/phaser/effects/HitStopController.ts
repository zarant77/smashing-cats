import Phaser from "phaser";

import type { GameEvent, GameSnapshot } from "@smashing-cats/protocol";

const HIT_STOP_MS = 80;
const HIT_STOP_ZOOM_PUNCH = 0.035;

export class HitStopController {
  private readonly playedEvents = new Set<string>();

  private frozenUntil = 0;
  private frozenSnapshot: GameSnapshot | undefined;
  private baseZoom = 1;

  public constructor(private readonly scene: Phaser.Scene) {}

  public update(snapshot: GameSnapshot): GameSnapshot {
    this.processEvents(snapshot);

    if (this.isFrozen()) {
      return this.frozenSnapshot ?? snapshot;
    }

    this.frozenSnapshot = undefined;

    return snapshot;
  }

  public isFrozen(): boolean {
    return this.scene.time.now < this.frozenUntil;
  }

  public destroy(): void {
    this.playedEvents.clear();
    this.frozenSnapshot = undefined;
    this.frozenUntil = 0;
  }

  private processEvents(snapshot: GameSnapshot): void {
    for (const event of snapshot.events) {
      if (this.playedEvents.has(event.id)) {
        continue;
      }

      this.playedEvents.add(event.id);

      if (!this.shouldTrigger(event)) {
        continue;
      }

      this.trigger(snapshot);
    }
  }

  private shouldTrigger(event: GameEvent): boolean {
    return event.type === "enemyKilled" || event.type === "civilianKilled";
  }

  private trigger(snapshot: GameSnapshot): void {
    const now = this.scene.time.now;

    this.frozenUntil = now + HIT_STOP_MS;
    this.frozenSnapshot = snapshot;

    this.punchCamera();
  }

  private punchCamera(): void {
    const camera = this.scene.cameras.main;

    this.baseZoom = camera.zoom;
    camera.setZoom(this.baseZoom + HIT_STOP_ZOOM_PUNCH);

    this.scene.tweens.killTweensOf(camera);

    this.scene.tweens.add({
      targets: camera,
      zoom: this.baseZoom,
      duration: HIT_STOP_MS * 2,
      ease: "Cubic.easeOut",
    });
  }
}
