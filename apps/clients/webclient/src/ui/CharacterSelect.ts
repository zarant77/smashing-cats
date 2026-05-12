import type { CharacterDefinition, EntityKind } from "@smashing-cats/protocol";
import type { Locale, Translator } from "../i18n.js";

type CharacterSelectOptions = {
  locale: Locale;
  t: Translator;
  initialCharacterKind: EntityKind | undefined;
  onSelect: (characterKind: EntityKind) => void;
};

type StatKey = "hp" | "moveSpeed" | "jumpForce";

type StatRange = {
  min: number;
  max: number;
};

type StatRanges = Record<StatKey, StatRange>;

const STAR_COUNT = 5;

export class CharacterSelect {
  private readonly element: HTMLDivElement;
  private locale: Locale;
  private t: Translator;
  private readonly onSelect: (characterKind: EntityKind) => void;
  private currentIndex = 0;
  private preferredCharacterKind: EntityKind | undefined;
  private lastCharacters: CharacterDefinition[] = [];

  public constructor(root: HTMLElement, options: CharacterSelectOptions) {
    this.locale = options.locale;
    this.t = options.t;
    this.preferredCharacterKind = options.initialCharacterKind;
    this.onSelect = options.onSelect;

    this.element = document.createElement("div");
    this.element.className = "character-select";

    root.append(this.element);

    window.addEventListener("keydown", this.handleKeyDown);
  }

  public setLocale(locale: Locale, t: Translator): void {
    this.locale = locale;
    this.t = t;
  }

  public setPreferredCharacter(characterKind: EntityKind): void {
    this.preferredCharacterKind = characterKind;
  }

  public render(characters: CharacterDefinition[], selected: boolean): void {
    this.lastCharacters = characters;

    if (selected) {
      this.element.hidden = true;
      this.element.replaceChildren();
      return;
    }

    this.element.hidden = false;

    if (characters.length === 0) {
      this.element.replaceChildren();
      return;
    }

    this.currentIndex = this.getCurrentIndex(characters);

    const ranges = getStatRanges(characters);
    const character = characters[this.currentIndex];

    if (!character) {
      return;
    }

    const panel = document.createElement("div");
    panel.className = "character-select-panel";

    const title = document.createElement("h1");
    title.textContent = this.t("chooseCat");

    const carousel = document.createElement("div");
    carousel.className = "character-carousel";

    const previousButton = createArrowButton("‹", "Previous character", () => {
      this.selectPreviousCharacter();
    });

    const nextButton = createArrowButton("›", "Next character", () => {
      this.selectNextCharacter();
    });

    const card = this.createCharacterCard(character, ranges);

    carousel.append(previousButton, card, nextButton);
    panel.append(title, carousel);

    this.element.replaceChildren(panel);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.element.hidden || this.lastCharacters.length === 0) {
      return;
    }

    switch (event.code) {
      case "ArrowLeft": {
        this.selectPreviousCharacter();
        event.preventDefault();
        break;
      }

      case "ArrowRight": {
        this.selectNextCharacter();
        event.preventDefault();
        break;
      }

      case "Enter":
      case "Space": {
        this.selectCurrentCharacter();
        event.preventDefault();
        break;
      }
    }
  };

  private selectPreviousCharacter(): void {
    this.currentIndex = wrapIndex(this.currentIndex - 1, this.lastCharacters.length);
    this.render(this.lastCharacters, false);
  }

  private selectNextCharacter(): void {
    this.currentIndex = wrapIndex(this.currentIndex + 1, this.lastCharacters.length);
    this.render(this.lastCharacters, false);
  }

  private selectCurrentCharacter(): void {
    const character = this.lastCharacters[this.currentIndex];

    if (!character) {
      return;
    }

    this.onSelect(character.kind);
  }

  private createCharacterCard(character: CharacterDefinition, ranges: StatRanges): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "character-card";
    button.type = "button";

    button.addEventListener("click", () => {
      this.onSelect(character.kind);
    });

    const image = document.createElement("img");
    image.className = "character-card-image";
    image.src = getCharacterImageSrc(character);
    image.alt = character.name[this.locale] ?? character.name.en;

    const name = document.createElement("strong");
    name.textContent = character.name[this.locale] ?? character.name.en;

    const stats = document.createElement("dl");
    stats.append(
      stat(this.t("hp"), character.hp, ranges.hp),
      stat(this.t("speed"), character.moveSpeed, ranges.moveSpeed),
      stat(this.t("jump"), character.jumpForce, ranges.jumpForce),
    );

    button.append(image, name, stats);

    return button;
  }

  private getCurrentIndex(characters: CharacterDefinition[]): number {
    const preferredIndex =
      this.preferredCharacterKind === undefined ? -1 : characters.findIndex((character) => character.kind === this.preferredCharacterKind);

    if (preferredIndex >= 0) {
      this.preferredCharacterKind = undefined;
      return preferredIndex;
    }

    return clampIndex(this.currentIndex, characters.length);
  }
}

function createArrowButton(label: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "character-carousel-arrow";
  button.type = "button";
  button.textContent = label;
  button.ariaLabel = ariaLabel;
  button.addEventListener("click", onClick);

  return button;
}

function stat(label: string, value: number, range: StatRange): HTMLElement {
  const wrapper = document.createElement("div");

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = stars(normalizeToStars(value, range));

  wrapper.append(term, description);

  return wrapper;
}

function getStatRanges(characters: CharacterDefinition[]): StatRanges {
  return {
    hp: getRange(characters.map((character) => character.hp)),
    moveSpeed: getRange(characters.map((character) => character.moveSpeed)),
    jumpForce: getRange(characters.map((character) => character.jumpForce)),
  };
}

function getRange(values: number[]): StatRange {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function normalizeToStars(value: number, range: StatRange): number {
  if (range.min === range.max) {
    return STAR_COUNT;
  }

  const ratio = (value - range.min) / (range.max - range.min);
  return Math.round(1 + ratio * (STAR_COUNT - 1));
}

function stars(count: number): string {
  return "★".repeat(count) + "☆".repeat(STAR_COUNT - count);
}

function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1);
}

function getCharacterImageSrc(character: CharacterDefinition): string {
  return `/portraits/${character.kind}.png`;
}
