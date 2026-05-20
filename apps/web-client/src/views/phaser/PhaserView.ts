import Phaser from "phaser";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import type { GameView, ViewOptions } from "../types.js";
import { AudioEventPlayer } from "./AudioEventPlayer.js";
import { SmashingCatsScene } from "./SmashingCatsScene.js";
import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";
import { getViewSize } from "../viewport.js";

export class PhaserView implements GameView {
  private readonly game: Phaser.Game;
  private readonly scene: SmashingCatsScene;
  private readonly audioEventPlayer = new AudioEventPlayer();

  public constructor(
    private readonly root: HTMLElement,
    private readonly options: ViewOptions,
  ) {
    this.root.replaceChildren();

    this.scene = new SmashingCatsScene();
    this.scene.setState(EMPTY_SNAPSHOT, undefined);

    const size = getViewSize(this.root);

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.root,
      backgroundColor: "#87ceeb",
      width: size.width,
      height: size.height,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      scene: this.scene,
    });

    this.resize();

    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.audioEventPlayer.play(snapshot, playerId);
    this.scene.setState(snapshot, playerId);
  }

  public setLocale(_locale: string, t: Translator): void {
    this.scene.setTranslator(t);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);

    this.game.destroy(true);
    this.root.replaceChildren();
  }

  private readonly resize = (): void => {
    const size = getViewSize(this.root);

    this.game.scale.resize(size.width, size.height);

    const canvas = this.game.canvas;

    canvas.style.width = `${size.styleWidth}px`;
    canvas.style.height = `${size.styleHeight}px`;

    this.scene.resize();
  };
}
