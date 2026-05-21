import Phaser from "phaser";

import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";

const RING_DEPTH = 320;
const PARTICLE_DEPTH = 321;
const FLASH_DEPTH = 322;

const RING_DURATION_MS = 360;
const PARTICLE_COUNT = 34;
const SHAKE_DURATION_MS = 150;
const SHAKE_INTENSITY = 0.014;
const SPLASH_EFFECT_RADIUS = 170;

export class SmashEffectRenderer {
  private readonly previousSmashing = new Map<string, boolean>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    for (const player of snapshot.players) {
      visibleIds.add(player.id);
      this.checkPlayer(player, snapshot, viewport);
    }

    this.removeMissingPlayers(visibleIds);
  }

  public destroy(): void {
    this.previousSmashing.clear();
  }

  private checkPlayer(player: PlayerSnapshot, snapshot: GameSnapshot, viewport: RenderViewport): void {
    const wasSmashing = this.previousSmashing.get(player.id) ?? false;

    this.previousSmashing.set(player.id, player.smashing);

    if (!player.alive || wasSmashing || !player.smashing) {
      return;
    }

    const [width] = player.size;

    const x = viewport.worldToScreenSize(player.x + width / 2);
    const y = viewport.worldToScreenY(snapshot.world.groundY);

    this.spawnSmashEffect(x, y);
  }

  private spawnSmashEffect(x: number, y: number): void {
    this.spawnImpactRing(x, y);
    this.spawnImpactFlash(x, y);
    this.spawnParticles(x, y);

    this.scene.cameras.main.shake(SHAKE_DURATION_MS, SHAKE_INTENSITY);
  }

  private spawnImpactRing(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 18);

    ring.setDepth(RING_DEPTH);
    ring.setFillStyle(0xffffff, 0);
    ring.setStrokeStyle(6, 0xffffff, 0.95);

    this.scene.tweens.add({
      targets: ring,
      radius: SPLASH_EFFECT_RADIUS,
      alpha: 0,
      duration: RING_DURATION_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  private spawnImpactFlash(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 36, 0xffffff, 0.8);

    flash.setDepth(FLASH_DEPTH);
    flash.setScale(0.45);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 160,
      ease: "Cubic.easeOut",
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  private spawnParticles(x: number, y: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(3, 7), 0xffffff, Phaser.Math.FloatBetween(0.65, 0.95));

      particle.setDepth(PARTICLE_DEPTH);

      const angle = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95);
      const distance = Phaser.Math.Between(45, 150);

      const targetX = x + Math.cos(angle) * distance * Phaser.Math.RND.pick([-1, 1]);
      const targetY = y - Math.sin(angle) * Phaser.Math.Between(20, 70);

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(220, 420),
        ease: "Cubic.easeOut",
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  private removeMissingPlayers(visibleIds: Set<string>): void {
    for (const id of this.previousSmashing.keys()) {
      if (!visibleIds.has(id)) {
        this.previousSmashing.delete(id);
      }
    }
  }
}
