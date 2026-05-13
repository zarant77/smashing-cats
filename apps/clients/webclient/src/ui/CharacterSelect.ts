import type { CharacterDefinition, EntityKind } from "@smashing-cats/protocol";
import type { Locale, Translator } from "../i18n.js";
import { audioEvents } from "../audio/audio.js";

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
    title.className = "character-select-title";
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
    audioEvents.uiClick();
  }

  private selectNextCharacter(): void {
    this.currentIndex = wrapIndex(this.currentIndex + 1, this.lastCharacters.length);
    this.render(this.lastCharacters, false);
    audioEvents.uiClick();
  }

  private selectCurrentCharacter(): void {
    const character = this.lastCharacters[this.currentIndex];

    if (!character) {
      return;
    }

    audioEvents.uiClick();
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

    const name = document.createElement("strong");

    // Set name
    name.textContent = image.alt = this.t(character.kind);

    const divider = document.createElement("div");

    divider.className = "character-divider";

    divider.innerHTML = `
      <span></span>
      <div class="character-divider-paw">🐾</div>
      <span></span>
    `;

    const stats = document.createElement("dl");

    stats.append(
      stat("❤️", this.t("hp"), character.hp, ranges.hp),
      stat("⚡", this.t("speed"), character.moveSpeed, ranges.moveSpeed),
      stat("🦘", this.t("jump"), character.jumpForce, ranges.jumpForce),
    );

    const controls = document.createElement("div");

    controls.className = "character-controls-hint";

    controls.innerHTML = `
      <div class="character-control-group">
        <kbd>←</kbd>
        <kbd>→</kbd>
        <span>Change</span>
      </div>

      <div class="character-control-separator"></div>

      <div class="character-control-group">
        <kbd>Enter</kbd>
        <kbd>Space</kbd>
        <span>Select</span>
      </div>
    `;

    button.append(image, name, divider, stats, controls);

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
  button.innerHTML = `<span>${label}</span>`;
  button.ariaLabel = ariaLabel;

  button.addEventListener("click", onClick);

  return button;
}

function stat(icon: string, label: string, value: number, range: StatRange): HTMLElement {
  const wrapper = document.createElement("div");

  const term = document.createElement("dt");

  term.innerHTML = `
    <span class="character-stat-icon">${icon}</span>
    ${label}
  `;

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
  return `/players/${character.kind}.png`;
}
