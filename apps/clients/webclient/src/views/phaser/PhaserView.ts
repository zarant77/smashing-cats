import Phaser from "phaser";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Locale, Translator } from "@smashing-cats/i18n";
import type { GameView } from "../types.js";

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;

export class PhaserView implements GameView {
  private readonly game: Phaser.Game;
  private readonly scene: SmashingCatsScene;

  public constructor(root: HTMLElement) {
    root.replaceChildren();

    this.scene = new SmashingCatsScene();

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: root,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      backgroundColor: "#87ceeb",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: this.scene,
    });
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.scene.setState(snapshot, playerId);
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.scene.setTranslator(t);
  }

  public destroy(): void {
    this.game.destroy(true);
  }
}

class SmashingCatsScene extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private snapshot: GameSnapshot | undefined;
  private playerId: PlayerId | undefined;
  private connectionText?: Phaser.GameObjects.Text;
  private t: Translator = (key) => key;

  public constructor() {
    super("SmashingCatsScene");
  }

  public create(): void {
    this.graphics = this.add.graphics();
  }

  public update(): void {
    this.draw();
  }

  public setState(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.snapshot = snapshot;
    this.playerId = playerId;
  }

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  private draw(): void {
    const graphics = this.graphics;

    if (graphics === undefined) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;

    graphics.clear();

    graphics.fillStyle(0x87ceeb);
    graphics.fillRect(0, 0, width, height);

    if (this.snapshot === undefined) {
      this.drawCenteredText(this.t("connecting"));
      return;
    }

    this.drawGround(graphics, width, height);
    this.drawEntities(graphics, width);
    this.drawPlayers(graphics);
  }

  private drawGround(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const groundY = this.snapshot?.world.groundY ?? height - 80;

    graphics.fillStyle(0x79b851);
    graphics.fillRect(0, groundY, width, height - groundY);
  }

  private drawEntities(graphics: Phaser.GameObjects.Graphics, width: number): void {
    const snapshot = this.snapshot;

    if (snapshot === undefined) {
      return;
    }

    for (const entity of snapshot.entities) {
      const x = entity.x - snapshot.world.scrollX;

      if (x + entity.width < 0 || x > width) {
        continue;
      }

      graphics.fillStyle(this.getEntityColor(entity.type, entity.alive));
      graphics.fillRect(x, entity.y, entity.width, entity.height);
    }
  }

  private drawPlayers(graphics: Phaser.GameObjects.Graphics): void {
    const snapshot = this.snapshot;

    if (snapshot === undefined) {
      return;
    }

    for (const player of snapshot.players) {
      const isLocal = player.playerId === this.playerId;
      const color = player.alive ? (isLocal ? 0xffcc33 : 0xf58ad4) : 0x555555;

      graphics.fillStyle(color);
      graphics.fillRect(player.x, player.y, player.width, player.height);
    }
  }

  private drawCenteredText(text: string): void {
    if (this.connectionText === undefined) {
      this.connectionText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, text, {
          fontFamily: "sans-serif",
          fontSize: "24px",
          color: "#111111",
        })
        .setOrigin(0.5)
        .setDepth(1000);
    }

    this.connectionText.setText(text);
    this.connectionText.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.connectionText.setVisible(true);
  }

  private getEntityColor(type: string, alive: boolean): number {
    if (!alive) {
      return 0x555555;
    }

    if (type === "obstacle") {
      return 0x1e7f3e;
    }

    if (type === "civilian") {
      return 0x4aa3df;
    }

    return 0x8b3a3a;
  }
}
