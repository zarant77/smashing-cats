import blessed from "blessed";
import type { Translator } from "@smashing-cats/i18n";

type GameOverOverlayOptions = {
  parent: blessed.Widgets.Node;
  screen: blessed.Widgets.Screen;
  score: number;
  t: Translator;
  onRestart: () => void;
  onExit: () => void;
};

export class GameOverOverlay {
  private readonly root: blessed.Widgets.BoxElement;

  public constructor(private readonly options: GameOverOverlayOptions) {
    this.root = blessed.box({
      parent: this.options.parent,
      top: "center",
      left: "center",
      width: 42,
      height: 13,
      border: "line",
      tags: true,
      align: "center",
      style: {
        bg: "black",
        fg: "white",
        border: {
          fg: "red",
        },
      },
      content: [
        "",
        `{bold}{red-fg}${this.options.t("gameOverTitle")}{/red-fg}{/bold}`,
        "",
        `${this.options.t("score")}: ${this.options.score}`,
        "",
        `[ ENTER ] ${this.options.t("restart")}`,
        `[ ESC ] ${this.options.t("toMainMenu")}`,
        `[ Ctrl+C ] ${this.options.t("exit")}`,
      ].join("\n"),
    });

    this.bindEvents();
  }

  public show(): void {
    this.root.focus();
    this.options.screen.render();
  }

  public destroy(): void {
    this.root.detach();
    this.options.screen.render();
  }

  private bindEvents(): void {
    this.root.key(["enter"], () => {
      this.options.onRestart();
    });

    this.root.key(["escape"], () => {
      this.options.onExit();
    });
  }
}
