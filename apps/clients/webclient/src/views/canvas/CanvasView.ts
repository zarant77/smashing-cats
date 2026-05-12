import type { EntitySnapshot, GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import type { Locale, Translator } from "../../i18n.js";
import type { GameView } from "../types.js";

const SHAKE_DURATION_MS = 180;
const SHAKE_STRENGTH = 5;

export class CanvasView implements GameView {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly seenEventIds = new Set<string>();
  private shakeUntil = 0;
  private t: Translator = (key) => key;

  public constructor(root: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 960;
    this.canvas.height = 540;
    root.replaceChildren(this.canvas);

    const context = this.canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas 2D context is unavailable");
    }

    this.context = context;
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    const ctx = this.context;
    this.updateShake(snapshot);
    const shake = getShakeOffset(this.shakeUntil);

    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (snapshot === undefined) {
      this.drawCenteredText(this.t("connecting"));
      ctx.restore();
      return;
    }

    ctx.fillStyle = "#79b851";
    ctx.fillRect(0, snapshot.world.groundY, this.canvas.width, this.canvas.height - snapshot.world.groundY);

    for (const entity of snapshot.entities) {
      this.drawEntity(snapshot, entity);
    }

    for (const player of snapshot.players) {
      this.drawPlayer(snapshot, player, player.playerId === playerId);
    }

    ctx.restore();
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.t = t;
  }

  private drawEntity(snapshot: GameSnapshot, entity: EntitySnapshot): void {
    const screenX = entity.x - snapshot.world.scrollX;
    const ctx = this.context;

    if (screenX + entity.width < 0 || screenX > this.canvas.width) {
      return;
    }

    if (!entity.alive) {
      ctx.fillStyle = "#555555";
    } else if (entity.type === "obstacle") {
      ctx.fillStyle = "#1e7f3e";
    } else if (entity.type === "civilian") {
      ctx.fillStyle = "#4aa3df";
    } else {
      ctx.fillStyle = getEnemyColor(entity.kind);
    }

    ctx.fillRect(screenX, entity.y, entity.width, entity.height);
    ctx.fillStyle = "#111111";
    ctx.font = "14px sans-serif";
    ctx.fillText(entity.alive ? entity.kind : `${entity.kind} dead`, screenX, entity.y - 6);
  }

  private drawPlayer(snapshot: GameSnapshot, player: PlayerSnapshot, isLocal: boolean): void {
    const ctx = this.context;
    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;
    ctx.fillStyle = player.alive ? (isLocal ? "#ffcc33" : "#f58ad4") : "#555555";
    ctx.globalAlpha = shouldBlinkOff ? 0.35 : 1;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#111111";
    ctx.font = "13px sans-serif";
    const label = player.smashing
      ? `SMASH ${player.hp}/${player.maxHp} ${player.score}`
      : `${player.playerId} ${player.hp}/${player.maxHp} ${player.score}`;
    ctx.fillText(label, player.x, player.y - 6);
  }

  private drawCenteredText(text: string): void {
    const ctx = this.context;
    ctx.fillStyle = "#111111";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    ctx.textAlign = "start";
  }

  private updateShake(snapshot: GameSnapshot | undefined): void {
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
}

function getShakeOffset(shakeUntil: number): { x: number; y: number } {
  const remaining = shakeUntil - performance.now();
  if (remaining <= 0) {
    return { x: 0, y: 0 };
  }

  const strength = SHAKE_STRENGTH * (remaining / SHAKE_DURATION_MS);
  return {
    x: (Math.random() * 2 - 1) * strength,
    y: (Math.random() * 2 - 1) * strength,
  };
}

function getEnemyColor(kind: EntitySnapshot["kind"]): string {
  switch (kind) {
    case "orc":
      return "#5c8f28";
    case "boar":
      return "#8b5a2b";
    case "rat":
      return "#777777";
    case "villager":
      return "#4aa3df";
    default:
      return "#222222";
  }
}
