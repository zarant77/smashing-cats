import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import type { GameView } from "../types.js";
import { BackgroundRenderer } from "./BackgroundRenderer.js";
import { EntityRenderer } from "./EntityRenderer.js";
import { FloatingTextRenderer } from "./FloatingTextRenderer.js";
import { GroundRenderer } from "./GroundRenderer.js";
import { PlayerRenderer } from "./PlayerRenderer.js";
import { ScreenShake } from "./ScreenShake.js";
import { resizeCanvasToRoot } from "./viewport.js";

export class CanvasView implements GameView {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly root: HTMLElement;

  private readonly background = new BackgroundRenderer();
  private readonly ground = new GroundRenderer();
  private readonly entities = new EntityRenderer();
  private readonly players = new PlayerRenderer();
  private readonly screenShake = new ScreenShake();
  private readonly floatingTexts = new FloatingTextRenderer();

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

    if (snapshot === undefined) {
      ctx.fillStyle = "#87ceeb";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawCenteredText(this.t("connecting"));
      return;
    }

    this.screenShake.update(snapshot);
    this.floatingTexts.update(snapshot);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.background.draw(ctx, this.canvas, snapshot);

    const shake = this.screenShake.getOffset();

    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.ground.draw(ctx, this.canvas, snapshot);

    for (const entity of snapshot.entities) {
      this.entities.draw(ctx, this.canvas.width, snapshot, entity);
    }

    for (const player of snapshot.players) {
      this.players.draw(ctx, snapshot, player, player.playerId === playerId);
    }

    this.floatingTexts.draw(ctx);

    ctx.restore();
  }

  public setLocale(_locale: string, t: Translator): void {
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
