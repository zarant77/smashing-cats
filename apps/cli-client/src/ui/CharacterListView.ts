import blessed from "blessed";
import { t } from "@smashing-cats/i18n";
import { terminalBell } from "../audio/TerminalBell.js";
import { CLI_CHARACTERS, type CliCharacter } from "../config/characters.js";

type CharacterListViewOptions = {
  parent: blessed.Widgets.Node;
  onSelect: (character: CliCharacter, index: number) => void;
  onFocus: () => void;
};

export class CharacterListView {
  public readonly element: blessed.Widgets.ListElement;

  private selectedIndex = 0;

  public constructor(private readonly options: CharacterListViewOptions) {
    this.element = blessed.list({
      parent: this.options.parent,
      top: 4,
      left: 4,
      width: 28,
      height: 12,
      label: ` ${t("chooseCat")} `,
      border: "line",
      keys: true,
      mouse: true,
      vi: true,
      items: CLI_CHARACTERS.map((character) => t(character.kind)),
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

    this.bindEvents();
  }

  public focus(): void {
    this.element.focus();
  }

  public setActive(active: boolean): void {
    this.element.style.border = {
      fg: active ? "yellow" : "cyan",
    };
  }

  public getSelectedCharacter(): CliCharacter {
    const character = CLI_CHARACTERS[this.selectedIndex];

    if (character === undefined) {
      throw new Error("Character not found");
    }

    return character;
  }

  public selectByOffset(offset: number): void {
    this.selectedIndex = (this.selectedIndex + offset + CLI_CHARACTERS.length) % CLI_CHARACTERS.length;
    this.syncSelection();
  }

  private bindEvents(): void {
    this.element.on("mousedown", () => {
      this.options.onFocus();
    });

    this.element.on("click", () => {
      this.options.onFocus();
    });

    this.element.on("select", (_, index) => {
      this.selectedIndex = index;
      this.syncSelection();
    });

    this.element.key(["up", "k"], () => {
      this.selectByOffset(-1);
    });

    this.element.key(["down", "j"], () => {
      this.selectByOffset(1);
    });
  }

  private syncSelection(): void {
    terminalBell.ui();
    this.element.select(this.selectedIndex);
    this.options.onSelect(this.getSelectedCharacter(), this.selectedIndex);
  }
}
