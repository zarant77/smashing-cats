import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";

type FloatingText = {
  playerId: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
};

const LIFE_MS = 900;

export class FloatingTextAsciiRenderer {
  private previousPlayers = new Map<string, PlayerSnapshot>();
  private readonly texts: FloatingText[] = [];

  public update(snapshot: GameSnapshot): void {
    const now = Date.now();

    for (const player of snapshot.players) {
      const previous = this.previousPlayers.get(player.playerId);

      if (previous !== undefined) {
        const scoreDelta = player.score - previous.score;
        const hpDelta = player.hp - previous.hp;

        if (scoreDelta !== 0) {
          this.add(player, scoreDelta > 0 ? `{green-fg}+${scoreDelta}{/green-fg}` : `{yellow-fg}${scoreDelta}{/yellow-fg}`);
        }

        if (hpDelta !== 0) {
          this.add(player, hpDelta > 0 ? `{green-fg}+${hpDelta} HP{/green-fg}` : `{red-fg}${hpDelta} HP{/red-fg}`);
        }
      }

      this.previousPlayers.set(player.playerId, { ...player });
    }

    this.removeExpired(now);
  }

  public render(buffer: AsciiBuffer, camera: AsciiCamera, groundY: number): void {
    const now = Date.now();

    for (const text of this.texts) {
      const age = now - text.createdAt;
      const lift = Math.floor(age / 180);

      const x = camera.screenXToColumn(text.x);
      const y = camera.worldToScreenY(text.y, groundY) - lift;

      buffer.drawText(x, y, text.text);
    }
  }

  private add(player: PlayerSnapshot, text: string): void {
    this.texts.push({
      playerId: player.playerId,
      text,
      x: player.x,
      y: player.y - 20,
      createdAt: Date.now(),
    });
  }

  private removeExpired(now: number): void {
    while (this.texts.length > 0 && now - this.texts[0]!.createdAt > LIFE_MS) {
      this.texts.shift();
    }
  }
}
