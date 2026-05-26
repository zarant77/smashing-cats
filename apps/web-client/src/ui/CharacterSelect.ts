import type { CharacterDefinition } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";

import { playSound } from "../audio/audio.js";
import {
  CHARACTER_ENTER_MS,
  CHARACTER_EXIT_MS,
  bindRepeatButton,
  buildCharacterCardHtml,
  buildCharacterSelectArrowHtml,
  clampIndex,
  getEnterClass,
  getExitClass,
  getStatRanges,
  removeCharacterAnimationClasses,
  isTextEditingTarget,
  wrapIndex,
  type CharacterChangeDirection,
} from "../helpers/index.js";

type CharacterSelectOptions = {
  initialCharacterKind: string | undefined;
  onSelect: (characterKind: string) => void;
};

export class CharacterSelect {
  private readonly element: HTMLDivElement;
  private readonly onSelect: (characterKind: string) => void;

  private currentIndex = 0;
  private preferredCharacterKind: string | undefined;
  private lastCharacters: CharacterDefinition[] = [];

  private exitTimeoutId: number | undefined;
  private enterTimeoutId: number | undefined;
  private nextEnterClass: string | undefined;
  private queuedDirection: CharacterChangeDirection | undefined;
  private transitioning = false;

  public constructor(root: HTMLElement, options: CharacterSelectOptions) {
    this.preferredCharacterKind = options.initialCharacterKind;
    this.onSelect = options.onSelect;

    this.element = document.createElement("div");
    this.element.className = "character-select";

    root.append(this.element);

    window.addEventListener("keydown", this.handleKeyDown);
  }

  public setPreferredCharacter(characterKind: string): void {
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

    this.element.innerHTML = `
      ${buildCharacterSelectArrowHtml("left", t("previousCharacter"))}

      ${buildCharacterCardHtml({
        character,
        ranges,
        name: t(character.kind),
        hpLabel: t("hp"),
        speedLabel: t("speed"),
        jumpLabel: t("jump"),
        selectLabel: t("selectCharacter"),
        enterClass: this.nextEnterClass,
      })}

      ${buildCharacterSelectArrowHtml("right", t("nextCharacter"))}
    `;

    this.bindRenderedElements();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.element.hidden || this.lastCharacters.length === 0 || isTextEditingTarget(event.target)) {
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

  private bindRenderedElements(): void {
    const previousButton = this.element.querySelector<HTMLButtonElement>(".character-select-arrow-left");
    const nextButton = this.element.querySelector<HTMLButtonElement>(".character-select-arrow-right");
    const selectButton = this.element.querySelector<HTMLButtonElement>(".character-card .button");

    if (previousButton !== null) {
      bindRepeatButton(previousButton, () => {
        this.selectPreviousCharacter();
      });
    }

    if (nextButton !== null) {
      bindRepeatButton(nextButton, () => {
        this.selectNextCharacter();
      });
    }

    selectButton?.addEventListener("click", () => {
      this.selectCurrentCharacter();
    });
  }

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

    this.exitTimeoutId = window.setTimeout(() => {
      this.currentIndex = nextIndex;
      this.nextEnterClass = getEnterClass(direction);

      this.render(this.lastCharacters, false);

      this.nextEnterClass = undefined;

      this.enterTimeoutId = window.setTimeout(() => {
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

  private clearTransition(): void {
    if (this.exitTimeoutId !== undefined) {
      window.clearTimeout(this.exitTimeoutId);
      this.exitTimeoutId = undefined;
    }

    if (this.enterTimeoutId !== undefined) {
      window.clearTimeout(this.enterTimeoutId);
      this.enterTimeoutId = undefined;
    }

    this.transitioning = false;
    this.queuedDirection = undefined;
    this.nextEnterClass = undefined;

    this.element.classList.remove("character-select-transitioning");
  }

  private getCurrentIndex(characters: CharacterDefinition[]): number {
    const preferredIndex =
      this.preferredCharacterKind === undefined
        ? -1
        : characters.findIndex((character) => character.kind === this.preferredCharacterKind);

    if (preferredIndex >= 0) {
      this.preferredCharacterKind = undefined;
      return preferredIndex;
    }

    return clampIndex(this.currentIndex, characters.length);
  }
}
