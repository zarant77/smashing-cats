import blessed from "blessed";
import { t } from "@smashing-cats/i18n";
import { CharacterListView } from "../ui/CharacterListView.js";
import { CharacterStatsView } from "../ui/CharacterStatsView.js";
import { terminalBell } from "../audio/TerminalBell.js";
import type { Screen } from "./Screen.js";

type StartScreenOptions = {
  screen: blessed.Widgets.Screen;
  onStart: (options: StartGameOptions) => void;
};

export type StartGameOptions = {
  characterKind: string;
  matchCode: string;
};

type FocusTarget = "cats" | "session" | "start";

export class StartScreen implements Screen {
  private readonly root: blessed.Widgets.BoxElement;
  private readonly characterList: CharacterListView;
  private readonly statsView = new CharacterStatsView();
  private readonly details: blessed.Widgets.BoxElement;
  private readonly sessionInput: blessed.Widgets.TextboxElement;
  private readonly startButton: blessed.Widgets.ButtonElement;

  private readonly focusTargets: FocusTarget[] = ["cats", "session", "start"];
  private selectedFocusIndex = 0;

  public constructor(private readonly options: StartScreenOptions) {
    this.root = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      style: { bg: "black", fg: "white" },
    });

    blessed.box({
      parent: this.root,
      top: 1,
      left: "center",
      width: "shrink",
      height: 1,
      tags: true,
      content: `{bold}${t("title")}{/bold}`,
      style: { fg: "yellow" },
    });

    this.characterList = new CharacterListView({
      parent: this.root,
      onFocus: () => this.focusBlock("cats"),
      onSelect: () => this.updateDetails(),
    });

    this.details = blessed.box({
      parent: this.root,
      top: 4,
      left: 36,
      width: 24,
      height: 12,
      border: "line",
      tags: true,
      style: { border: { fg: "cyan" } },
    });

    blessed.text({
      parent: this.root,
      top: 16,
      left: 4,
      width: 30,
      height: 1,
      content: t("matchCode"),
      style: { fg: "white" },
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
      style: { border: { fg: "cyan" } },
    });

    this.startButton = blessed.button({
      parent: this.root,
      top: 17,
      left: 36,
      width: 24,
      height: 3,
      content: ` ${t("startGame")} `,
      align: "center",
      valign: "middle",
      mouse: true,
      keys: true,
      border: "line",
      style: {
        bg: "green",
        fg: "black",
        border: { fg: "green" },
      },
    });

    blessed.box({
      parent: this.root,
      bottom: 1,
      left: 4,
      width: "90%",
      height: 2,
      tags: true,
      content: t("startScreenHint"),
      style: { fg: "gray" },
    });

    this.bindEvents();
    this.updateDetails();
  }

  public show(): void {
    this.options.screen.append(this.root);
    this.focusBlock("cats");
  }

  public destroy(): void {
    this.root.detach();
    this.options.screen.render();
  }

  private bindEvents(): void {
    this.options.screen.on("keypress", (ch: string | undefined, key: blessed.Widgets.Events.IKeyEventArg) => {
      if (key.name === "tab") {
        this.selectFocusByOffset(1);
        return;
      }

      if (this.getCurrentFocusTarget() === "session") {
        this.handleSessionInputKey(ch, key);
      }
    });

    this.root.key(["C-c"], () => process.exit(0));

    this.root.key(["enter"], () => {
      if (this.getCurrentFocusTarget() !== "session") {
        this.startGame();
      }
    });

    this.sessionInput.on("mousedown", () => this.focusBlock("session"));
    this.sessionInput.on("click", () => this.focusBlock("session"));

    this.startButton.on("mousedown", () => this.focusBlock("start"));
    this.startButton.on("click", () => this.focusBlock("start"));
    this.startButton.on("press", () => this.startGame());
  }

  private selectFocusByOffset(offset: number): void {
    terminalBell.ui();
    const nextIndex = (this.selectedFocusIndex + offset + this.focusTargets.length) % this.focusTargets.length;
    this.focusBlock(this.focusTargets[nextIndex] ?? "cats");
  }

  private focusBlock(target: FocusTarget): void {
    const index = this.focusTargets.indexOf(target);

    if (index === -1) {
      return;
    }

    this.selectedFocusIndex = index;

    this.characterList.setActive(target === "cats");
    this.sessionInput.style.border = { fg: target === "session" ? "yellow" : "cyan" };
    this.startButton.style.border = { fg: target === "start" ? "yellow" : "green" };
    this.startButton.style.bg = target === "start" ? "yellow" : "green";

    if (target === "cats") {
      this.characterList.focus();
    } else if (target === "session") {
      this.sessionInput.focus();
    } else {
      this.root.focus();
    }

    this.options.screen.render();
  }

  private getCurrentFocusTarget(): FocusTarget {
    return this.focusTargets[this.selectedFocusIndex] ?? "cats";
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

    const value = ch?.toUpperCase();

    if (value === undefined || !/^[0-9A-F]$/.test(value)) {
      return;
    }

    this.sessionInput.setValue(`${this.sessionInput.getValue()}${value}`);
    this.options.screen.render();
  }

  private getMatchCode(): string {
    return this.sessionInput
      .getValue()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "");
  }

  private startGame(): void {
    const character = this.characterList.getSelectedCharacter();

    let matchCode = this.getMatchCode();

    if (matchCode.length === 0) {
      matchCode = Math.random().toString(16).slice(2, 8).toUpperCase();
    }

    this.options.onStart({
      characterKind: character.kind,
      matchCode,
    });
  }

  private updateDetails(): void {
    const character = this.characterList.getSelectedCharacter();

    this.details.setLabel(` ${t(character.kind)} `);
    this.details.setContent(this.statsView.render(character, t));
    this.options.screen.render();
  }
}
