import type { CharacterDefinition, EntityKind } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { playSound } from "../audio/audio.js";

type CharacterSelectOptions = {
  locale: string;
  t: Translator;
  initialCharacterKind: EntityKind | undefined;
  onSelect: (characterKind: EntityKind) => void;
};

type StatKey = "hp" | "moveSpeed" | "jumpForce";
type StatClassName = "hp" | "speed" | "jump";
type CharacterChangeDirection = "previous" | "next";

type StatRange = {
  min: number;
  max: number;
};

type StatRanges = Record<StatKey, StatRange>;

const STAT_SEGMENT_COUNT = 5;
const CHARACTER_EXIT_MS = 320;
const CHARACTER_ENTER_MS = 420;

const CHARACTER_ANIMATION_CLASSES = [
  "character-card-image-enter-left",
  "character-card-image-enter-right",
  "character-card-image-exit-left",
  "character-card-image-exit-right",
] as const;

export class CharacterSelect {
  private readonly element: HTMLDivElement;
  private locale: string;
  private t: Translator;
  private readonly onSelect: (characterKind: EntityKind) => void;

  private currentIndex = 0;
  private preferredCharacterKind: EntityKind | undefined;
  private lastCharacters: CharacterDefinition[] = [];

  private transitionToken = 0;
  private exitTimeoutId: number | undefined;
  private enterTimeoutId: number | undefined;
  private nextEnterClass: string | undefined;
  private queuedDirection: CharacterChangeDirection | undefined;
  private transitioning = false;

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

  public setLocale(locale: string, t: Translator): void {
    this.locale = locale;
    this.t = t;
  }

  public setPreferredCharacter(characterKind: EntityKind): void {
    this.preferredCharacterKind = characterKind;
  }

  public render(characters: CharacterDefinition[], selected: boolean): void {
    this.lastCharacters = characters;

    if (selected) {
      this.clearTransition();
      this.element.hidden = true;
      this.element.replaceChildren();
      return;
    }

    this.element.hidden = false;

    if (characters.length === 0) {
      this.clearTransition();
      this.element.replaceChildren();
      return;
    }

    this.currentIndex = this.getCurrentIndex(characters);

    const character = characters[this.currentIndex];

    if (!character) {
      return;
    }

    const ranges = getStatRanges(characters);

    const previousButton = createArrowButton("left", this.t("previousCharacter"), () => {
      this.selectPreviousCharacter();
    });

    const nextButton = createArrowButton("right", this.t("nextCharacter"), () => {
      this.selectNextCharacter();
    });

    const card = this.createCharacterCard(character, ranges);

    this.element.replaceChildren(previousButton, card, nextButton);
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
    this.changeCharacter("previous");
  }

  private selectNextCharacter(): void {
    this.changeCharacter("next");
  }

  private changeCharacter(direction: CharacterChangeDirection): void {
    if (this.lastCharacters.length === 0) {
      return;
    }

    if (this.transitioning) {
      this.queuedDirection = direction;
      return;
    }

    this.runCharacterTransition(direction);
  }

  private runCharacterTransition(direction: CharacterChangeDirection): void {
    this.transitioning = true;

    playSound("sound.ui_click");

    const nextIndex =
      direction === "next"
        ? wrapIndex(this.currentIndex + 1, this.lastCharacters.length)
        : wrapIndex(this.currentIndex - 1, this.lastCharacters.length);

    const image = this.element.querySelector<HTMLImageElement>(".character-card-image");

    if (image === null) {
      this.currentIndex = nextIndex;
      this.render(this.lastCharacters, false);

      this.transitioning = false;

      return;
    }

    removeCharacterAnimationClasses(image);

    image.classList.add(getExitClass(direction));

    window.setTimeout(() => {
      this.currentIndex = nextIndex;

      this.nextEnterClass = getEnterClass(direction);

      this.render(this.lastCharacters, false);

      this.nextEnterClass = undefined;

      window.setTimeout(() => {
        this.transitioning = false;

        if (this.queuedDirection !== undefined) {
          const queued = this.queuedDirection;

          this.queuedDirection = undefined;

          this.runCharacterTransition(queued);
        }
      }, CHARACTER_ENTER_MS);
    }, CHARACTER_EXIT_MS);
  }

  private selectCurrentCharacter(): void {
    const character = this.lastCharacters[this.currentIndex];

    if (!character) {
      return;
    }

    playSound("sound.ui_click");
    this.onSelect(character.kind);
  }

  private createCharacterCard(character: CharacterDefinition, ranges: StatRanges): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "character-card";

    const name = document.createElement("strong");
    name.className = "character-card-name";
    name.textContent = this.t(character.kind);

    const preview = document.createElement("div");
    preview.className = "character-card-preview";

    const platform = document.createElement("img");
    platform.className = "character-card-platform";
    platform.src = "/ui/character_platform.png";
    platform.alt = "";

    const image = document.createElement("img");
    image.className = "character-card-image";

    if (this.nextEnterClass !== undefined) {
      image.classList.add(this.nextEnterClass);
    }

    image.src = getCharacterImageSrc(character);
    image.alt = this.t(character.kind);

    preview.append(platform, image);

    const stats = document.createElement("dl");
    stats.className = "character-card-stats";

    stats.append(
      stat(this.t("hp"), character.hp, ranges.hp, "hp"),
      stat(this.t("speed"), character.moveSpeed, ranges.moveSpeed, "speed"),
      stat(this.t("jump"), character.jumpForce, ranges.jumpForce, "jump"),
    );

    const selectButton = document.createElement("button");
    selectButton.className = "character-select-button";
    selectButton.type = "button";
    selectButton.textContent = this.t("selectCharacter");

    selectButton.addEventListener("click", () => {
      this.selectCurrentCharacter();
    });

    card.append(name, preview, stats, selectButton);

    return card;
  }

  private clearTransition(): void {
    this.transitionToken++;

    if (this.exitTimeoutId !== undefined) {
      window.clearTimeout(this.exitTimeoutId);
      this.exitTimeoutId = undefined;
    }

    if (this.enterTimeoutId !== undefined) {
      window.clearTimeout(this.enterTimeoutId);
      this.enterTimeoutId = undefined;
    }

    this.element.classList.remove("character-select-transitioning");
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

function createArrowButton(direction: "left" | "right", ariaLabel: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");

  button.className = `character-select-arrow character-select-arrow-${direction}`;
  button.type = "button";
  button.ariaLabel = ariaLabel;

  const image = document.createElement("img");

  image.className = "character-select-arrow-image";
  image.src = "/ui/arrow_left.png";
  image.alt = "";

  button.append(image);
  bindRepeatButton(button, onClick);

  return button;
}

function bindRepeatButton(button: HTMLButtonElement, onPress: () => void): void {
  let intervalId: number | undefined;
  let timeoutId: number | undefined;

  const stop = (): void => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    if (intervalId !== undefined) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }

    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    stop();
    button.setPointerCapture(event.pointerId);

    onPress();

    timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(onPress, 180);
    }, 280);

    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  });

  button.addEventListener("lostpointercapture", stop);
}

function stat(label: string, value: number, range: StatRange, className: StatClassName): HTMLElement {
  const wrapper = document.createElement("div");

  wrapper.className = `character-stat character-stat-${className}`;

  const term = document.createElement("dt");

  const iconElement = document.createElement("span");

  iconElement.className = "character-stat-icon";

  const labelElement = document.createElement("span");

  labelElement.className = "character-stat-label";
  labelElement.textContent = label;

  term.append(iconElement, labelElement);

  const description = document.createElement("dd");

  description.className = "character-stat-bar";

  const filledSegments = normalizeToSegments(value, range);

  for (let index = 0; index < STAT_SEGMENT_COUNT; index++) {
    const segment = document.createElement("span");

    segment.className = "character-stat-segment";

    if (index < filledSegments) {
      segment.classList.add("character-stat-segment-filled");
    }

    description.append(segment);
  }

  wrapper.append(term, description);

  return wrapper;
}

function getExitClass(direction: CharacterChangeDirection): string {
  return direction === "next" ? "character-card-image-exit-left" : "character-card-image-exit-right";
}

function getEnterClass(direction: CharacterChangeDirection): string {
  return direction === "next" ? "character-card-image-enter-right" : "character-card-image-enter-left";
}

function removeCharacterAnimationClasses(image: HTMLImageElement): void {
  image.classList.remove(...CHARACTER_ANIMATION_CLASSES);
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

function normalizeToSegments(value: number, range: StatRange): number {
  if (range.min === range.max) {
    return STAT_SEGMENT_COUNT;
  }

  const ratio = (value - range.min) / (range.max - range.min);

  return Math.round(1 + ratio * (STAT_SEGMENT_COUNT - 1));
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
