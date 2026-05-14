import blessed from "blessed";
import type { Translator } from "@smashing-cats/i18n";
import { CLI_CHARACTERS } from "../config/characters.js";
import type { Screen } from "./Screen.js";
import { stars } from "../ui/stars.js";

type StartScreenOptions = {
  screen: blessed.Widgets.Screen;
  t: Translator;
  onStart: (options: StartGameOptions) => void;
};

export type StartGameOptions = {
  characterKind: string;
  sessionCode: string;
};

type Character = {
  kind: string;
  hp: number;
  moveSpeed: number;
  jumpForce: number;
};

type FocusTarget = "cats" | "session" | "start";

export class StartScreen implements Screen {
  private readonly root: blessed.Widgets.BoxElement;
  private readonly list: blessed.Widgets.ListElement;
  private readonly details: blessed.Widgets.BoxElement;
  private readonly sessionInput: blessed.Widgets.TextboxElement;
  private readonly startButton: blessed.Widgets.ButtonElement;

  private readonly focusTargets: FocusTarget[] = ["cats", "session", "start"];

  private selectedIndex = 0;
  private selectedFocusIndex = 0;

  public constructor(private readonly options: StartScreenOptions) {
    this.root = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      style: {
        bg: "black",
        fg: "white",
      },
    });

    blessed.box({
      parent: this.root,
      top: 1,
      left: "center",
      width: "shrink",
      height: 1,
      tags: true,
      content: `{bold}${this.options.t("title")}{/bold}`,
      style: {
        fg: "yellow",
      },
    });

    this.list = blessed.list({
      parent: this.root,
      top: 4,
      left: 4,
      width: 28,
      height: 12,
      label: ` ${this.options.t("chooseCat")} `,
      border: "line",
      keys: true,
      mouse: true,
      vi: true,
      items: CLI_CHARACTERS.map((character) => this.options.t(character.kind)),
      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },
        item: {
          fg: "white",
        },
        border: {
          fg: "cyan",
        },
      },
    });

    this.details = blessed.box({
      parent: this.root,
      top: 4,
      left: 36,
      width: 24,
      height: 12,
      border: "line",
      tags: true,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    blessed.text({
      parent: this.root,
      top: 16,
      left: 4,
      width: 30,
      height: 1,
      content: this.options.t("sessionCode"),
      style: {
        fg: "white",
      },
    });

    this.sessionInput = blessed.textbox({
      parent: this.root,
      top: 17,
      left: 4,
      width: 28,
      height: 3,
      border: "line",
      inputOnFocus: false,
      mouse: true,
      keys: true,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    this.startButton = blessed.button({
      parent: this.root,
      top: 17,
      left: 36,
      width: 24,
      height: 3,
      content: ` ${this.options.t("startGame")} `,
      align: "center",
      valign: "middle",
      mouse: true,
      keys: true,
      border: "line",
      style: {
        bg: "green",
        fg: "black",
        focus: {
          bg: "green",
          fg: "black",
        },
        border: {
          fg: "green",
        },
      },
    });

    blessed.box({
      parent: this.root,
      bottom: 1,
      left: 4,
      width: "90%",
      height: 2,
      tags: true,
      content: this.options.t("cliHint"),
      style: {
        fg: "gray",
      },
    });

    this.bindEvents();
    this.updateDetails();
  }

  public show(): void {
    this.options.screen.append(this.root);
    this.focusBlockByIndex(this.selectedFocusIndex);
  }

  public destroy(): void {
    this.root.detach();
    this.options.screen.render();
  }

  private bindEvents(): void {
    this.options.screen.on("keypress", (ch: string | undefined, key: blessed.Widgets.Events.IKeyEventArg) => {
      if (key.name === "tab") {
        this.focusNextBlock();
        return;
      }

      if (key.name === "S-tab") {
        this.focusPreviousBlock();
        return;
      }

      if (this.getCurrentFocusTarget() !== "session") {
        return;
      }

      this.handleSessionInputKey(ch, key);
    });

    this.root.key(["q", "C-c"], () => {
      process.exit(0);
    });

    this.root.key(["enter"], () => {
      if (this.getCurrentFocusTarget() === "session") {
        return;
      }

      this.startGame();
    });

    this.list.on("mousedown", () => {
      this.focusBlock("cats");
    });

    this.sessionInput.on("mousedown", () => {
      this.focusBlock("session");
    });

    this.startButton.on("mousedown", () => {
      this.focusBlock("start");
    });

    this.list.on("click", () => {
      this.focusBlock("cats");
    });

    this.sessionInput.on("click", () => {
      this.focusBlock("session");
    });

    this.startButton.on("click", () => {
      this.focusBlock("start");
    });

    this.list.on("select", (_, index) => {
      this.selectedIndex = index;
      this.updateDetails();
    });

    this.list.key(["up", "k"], () => {
      this.selectCharacterByOffset(-1);
    });

    this.list.key(["down", "j"], () => {
      this.selectCharacterByOffset(1);
    });

    this.startButton.on("press", () => {
      this.startGame();
    });
  }

  private focusNextBlock(): void {
    this.selectFocusByOffset(1);
  }

  private focusPreviousBlock(): void {
    this.selectFocusByOffset(-1);
  }

  private selectFocusByOffset(offset: number): void {
    const nextIndex = (this.selectedFocusIndex + offset + this.focusTargets.length) % this.focusTargets.length;

    this.focusBlockByIndex(nextIndex);
  }

  private focusBlockByIndex(index: number): void {
    const target = this.focusTargets[index];

    if (target === undefined) {
      return;
    }

    this.selectedFocusIndex = index;
    this.focusBlock(target);
  }

  private focusBlock(target: FocusTarget): void {
    const index = this.focusTargets.indexOf(target);

    if (index === -1) {
      return;
    }

    this.selectedFocusIndex = index;
    this.setActiveBorders(target);

    if (target === "cats") {
      this.list.focus();
    }

    if (target === "session") {
      this.sessionInput.focus();
    }

    if (target === "start") {
      this.root.focus();
    }

    this.options.screen.render();
  }

  private setActiveBorders(target: FocusTarget): void {
    this.list.style.border = {
      fg: target === "cats" ? "yellow" : "cyan",
    };

    this.sessionInput.style.border = {
      fg: target === "session" ? "yellow" : "cyan",
    };

    this.startButton.style.border = {
      fg: target === "start" ? "yellow" : "green",
    };

    this.startButton.style.bg = target === "start" ? "yellow" : "green";
    this.startButton.style.fg = "black";

    this.details.style.border = {
      fg: "cyan",
    };

    this.options.screen.render();
  }

  private getCurrentFocusTarget(): FocusTarget {
    const target = this.focusTargets[this.selectedFocusIndex];

    if (target === undefined) {
      throw new Error("Focus target not found");
    }

    return target;
  }

  private selectCharacterByOffset(offset: number): void {
    const nextIndex = (this.selectedIndex + offset + CLI_CHARACTERS.length) % CLI_CHARACTERS.length;

    this.selectedIndex = nextIndex;
    this.updateDetails();
  }

  private handleSessionInputKey(ch: string | undefined, key: blessed.Widgets.Events.IKeyEventArg): void {
    if (key.name === "backspace") {
      this.sessionInput.setValue(this.sessionInput.getValue().slice(0, -1));
      this.options.screen.render();
      return;
    }

    if (key.name === "delete") {
      this.sessionInput.clearValue();
      this.options.screen.render();
      return;
    }

    if (ch === undefined) {
      return;
    }

    const value = ch.toUpperCase();

    if (!/^[0-9A-F]$/.test(value)) {
      this.options.screen.render();
      return;
    }

    this.sessionInput.setValue(`${this.sessionInput.getValue()}${value}`);
    this.options.screen.render();
  }

  private getSessionCode(): string {
    return this.sessionInput
      .getValue()
      .toUpperCase()
      .replace(/[^0-9A-F]/g, "");
  }

  private startGame(): void {
    const character = this.getSelectedCharacter();

    this.options.onStart({
      characterKind: character.kind,
      sessionCode: this.getSessionCode(),
    });
  }

  private updateDetails(): void {
    const character = this.getSelectedCharacter();

    this.details.setLabel(` ${this.options.t(character.kind)} `);

    this.details.setContent(
      [
        ` ${this.options.t("hp")}`,
        ` ${stars(character.hp)}`,
        "",
        ` ${this.options.t("speed")}`,
        ` ${stars(this.normalizeSpeed(character.moveSpeed))}`,
        "",
        ` ${this.options.t("jump")}`,
        ` ${stars(this.normalizeJump(character.jumpForce))}`,
      ].join("\n"),
    );

    this.list.select(this.selectedIndex);
    this.options.screen.render();
  }

  private getSelectedCharacter(): Character {
    const character = CLI_CHARACTERS[this.selectedIndex];

    if (character === undefined) {
      throw new Error("Character not found");
    }

    return character;
  }

  private normalizeSpeed(value: number): number {
    return Math.ceil(value / 100);
  }

  private normalizeJump(value: number): number {
    return Math.ceil(value / 250);
  }
}
