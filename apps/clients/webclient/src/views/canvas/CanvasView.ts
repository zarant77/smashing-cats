import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Locale, Translator } from "../../i18n.js";
import type { GameView } from "../types.js";
import { EntityRenderer } from "./EntityRenderer.js";
import { PlayerRenderer } from "./PlayerRenderer.js";
import { ScreenShake } from "./ScreenShake.js";
import { resizeCanvasToRoot } from "./viewport.js";

export class CanvasView implements GameView {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly root: HTMLElement;
  private readonly entities = new EntityRenderer();
  private readonly players = new PlayerRenderer();
  private readonly screenShake = new ScreenShake();
  private t: Translator = (key) => key;

  public constructor(root: HTMLElement) {
    this.root = root;

    this.canvas = document.createElement("canvas");
    root.replaceChildren(this.canvas);

    resizeCanvasToRoot(this.canvas, this.root);

    const context = this.canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas 2D context is unavailable");
    }

    this.context = context;
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    const ctx = this.context;

    resizeCanvasToRoot(this.canvas, this.root);
    this.screenShake.update(snapshot);

    const shake = this.screenShake.getOffset();

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
      this.entities.draw(ctx, this.canvas.width, snapshot, entity);
    }

    for (const player of snapshot.players) {
      this.players.draw(ctx, snapshot, player, player.playerId === playerId);
    }

    ctx.restore();
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.t = t;
  }

  private drawCenteredText(text: string): void {
    const ctx = this.context;

    ctx.fillStyle = "#111111";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    ctx.textAlign = "start";
  }
}
