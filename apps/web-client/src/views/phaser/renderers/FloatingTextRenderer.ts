import Phaser from "phaser";

import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";

type PlayerStats = {
  hp: number;
  score: number;
};

const DEPTH = 200;
const LIFETIME_MS = 1600;

export class FloatingTextRenderer {
  private readonly previousStats = new Map<string, PlayerStats>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    for (const player of snapshot.players) {
      visibleIds.add(player.id);
      this.checkPlayer(player, viewport);
    }

    this.removeMissingPlayers(visibleIds);
  }

  public destroy(): void {
    this.previousStats.clear();
  }

  private checkPlayer(player: PlayerSnapshot, viewport: RenderViewport): void {
    const previous = this.previousStats.get(player.id);

    this.previousStats.set(player.id, {
      hp: player.hp,
      score: player.score,
    });

    if (previous === undefined) {
      return;
    }

    const screenX = viewport.worldToScreenSize(player.x + player.size[0] / 2);
    const screenY = viewport.worldToScreenY(player.y) - 16;

    const hpDelta = player.hp - previous.hp;

    if (hpDelta < 0) {
      this.spawnText(`${hpDelta} HP`, screenX, screenY, "#ff4444");
    }

    const scoreDelta = player.score - previous.score;

    if (scoreDelta > 0) {
      this.spawnText(`+${scoreDelta}`, screenX, screenY - 24, "#ffee55");
    }

    if (scoreDelta < 0) {
      this.spawnText(`${scoreDelta}`, screenX, screenY - 24, "#ff7777");
    }
  }

  private spawnText(text: string, x: number, y: number, color: string): void {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: "GameFont",
      fontSize: "28px",
      color,
      stroke: "#000000",
      strokeThickness: 5,
    });

    label.setOrigin(0.5);
    label.setDepth(DEPTH);

    this.scene.tweens.add({
      targets: label,
      y: y - 56,
      alpha: 0,
      scale: 1.35,
      duration: LIFETIME_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private removeMissingPlayers(visibleIds: Set<string>): void {
    for (const id of this.previousStats.keys()) {
      if (!visibleIds.has(id)) {
        this.previousStats.delete(id);
      }
    }
  }
}
