import type { GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "./viewport.js";

type FloatingText = {
  id: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
  color: string;
};

const LIFE_MS = 900;
const FLOAT_DISTANCE = 42;

export class FloatingTextRenderer {
  private readonly texts: FloatingText[] = [];
  private readonly previousPlayers = new Map<PlayerId, PlayerSnapshot>();

  public update(snapshot: GameSnapshot | undefined): void {
    if (snapshot === undefined) {
      this.previousPlayers.clear();
      this.texts.length = 0;
      return;
    }

    for (const player of snapshot.players) {
      const previous = this.previousPlayers.get(player.playerId);

      if (previous !== undefined) {
        this.spawnHpText(previous, player);
        this.spawnScoreText(previous, player);
      }

      this.previousPlayers.set(player.playerId, { ...player });
    }

    const now = performance.now();

    for (let index = this.texts.length - 1; index >= 0; index--) {
      const text = this.texts[index];

      if (text === undefined) {
        continue;
      }

      if (now - text.createdAt > LIFE_MS) {
        this.texts.splice(index, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, viewport: RenderViewport): void {
    const now = performance.now();

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(viewport.worldToScreenSize(24))}px sans-serif`;
    ctx.lineWidth = Math.max(2, viewport.worldToScreenSize(4));

    for (const text of this.texts) {
      const progress = Math.min(1, (now - text.createdAt) / LIFE_MS);

      const x = viewport.worldToScreenSize(text.x);
      const y = viewport.worldToScreenY(text.y - progress * FLOAT_DISTANCE);
      const alpha = 1 - progress;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillStyle = text.color;

      ctx.strokeText(text.text, x, y);
      ctx.fillText(text.text, x, y);
    }

    ctx.restore();
  }

  private spawnHpText(previous: PlayerSnapshot, current: PlayerSnapshot): void {
    const hpDelta = current.hp - previous.hp;

    if (hpDelta >= 0) {
      return;
    }

    const [width] = current.size;

    this.spawn({
      text: `${hpDelta} HP`,
      x: current.x + width / 2,
      y: current.y - 18,
      color: "#ff4040",
    });
  }

  private spawnScoreText(previous: PlayerSnapshot, current: PlayerSnapshot): void {
    const scoreDelta = current.score - previous.score;

    if (scoreDelta === 0) {
      return;
    }

    const [width] = current.size;

    this.spawn({
      text: scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`,
      x: current.x + width / 2,
      y: current.y - 44,
      color: scoreDelta > 0 ? "#ffe066" : "#ff7070",
    });
  }

  private spawn(data: Omit<FloatingText, "id" | "createdAt">): void {
    this.texts.push({
      ...data,
      id: crypto.randomUUID(),
      createdAt: performance.now(),
    });
  }
}
