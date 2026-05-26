import type { CharacterDefinition } from "@smashing-cats/protocol";

export type StatKey = "hp" | "moveSpeed" | "jumpForce";
export type StatClassName = "hp" | "speed" | "jump";
export type CharacterChangeDirection = "previous" | "next";

export type StatRange = {
  min: number;
  max: number;
};

export type StatRanges = Record<StatKey, StatRange>;

export const STAT_SEGMENT_COUNT = 5;
export const CHARACTER_EXIT_MS = 320;
export const CHARACTER_ENTER_MS = 420;

const CHARACTER_ANIMATION_CLASSES = [
  "character-card-image-enter-left",
  "character-card-image-enter-right",
  "character-card-image-exit-left",
  "character-card-image-exit-right",
] as const;

type BuildCharacterCardHtmlOptions = {
  character: CharacterDefinition;
  ranges: StatRanges;
  name: string;
  hpLabel: string;
  speedLabel: string;
  jumpLabel: string;
  selectLabel: string;
  enterClass: string | undefined;
};

export function buildCharacterSelectArrowHtml(direction: "left" | "right", ariaLabel: string): string {
  return `
    <button
      class="character-select-arrow character-select-arrow-${direction}"
      type="button"
      aria-label="${escapeHtml(ariaLabel)}"
    >
      <img
        class="character-select-arrow-image"
        src="/ui/arrow_left.png"
        alt=""
      />
    </button>
  `;
}

export function buildCharacterCardHtml(options: BuildCharacterCardHtmlOptions): string {
  const { character, ranges, name, hpLabel, speedLabel, jumpLabel, selectLabel, enterClass } = options;

  const imageClass =
    enterClass === undefined ? "portrait character-card-image" : `portrait character-card-image ${enterClass}`;

  return `
    <div class="character-card">
      <strong class="character-card-name">
        ${escapeHtml(name)}
      </strong>

      <div class="character-preview">
        <img
          class="platform"
          src="/ui/character_platform.png"
          alt=""
        />

        <img
          class="${imageClass}"
          src="${getCharacterImageSrc(character)}"
          alt="${escapeHtml(name)}"
        />
      </div>

      <dl class="character-card-stats">
        ${buildStatHtml(hpLabel, character.hp, ranges.hp, "hp")}
        ${buildStatHtml(speedLabel, character.moveSpeed, ranges.moveSpeed, "speed")}
        ${buildStatHtml(jumpLabel, character.jumpForce, ranges.jumpForce, "jump")}
      </dl>

      <button class="button" type="button">
        ${escapeHtml(selectLabel)}
      </button>
    </div>
  `;
}

export function buildStatHtml(label: string, value: number, range: StatRange, className: StatClassName): string {
  const filledSegments = normalizeToSegments(value, range);

  return `
    <div class="character-stat character-stat-${className}">
      <dt>
        <span class="character-icon"><span class="icon icon-${className}"></span></span>
        <span class="character-stat-label">
          ${escapeHtml(label)}
        </span>
      </dt>

      <dd class="character-stat-bar">
        ${buildStatSegmentsHtml(filledSegments)}
      </dd>
    </div>
  `;
}

export function bindRepeatButton(button: HTMLButtonElement, onPress: () => void): void {
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

export function getExitClass(direction: CharacterChangeDirection): string {
  return direction === "next" ? "character-card-image-exit-left" : "character-card-image-exit-right";
}

export function getEnterClass(direction: CharacterChangeDirection): string {
  return direction === "next" ? "character-card-image-enter-right" : "character-card-image-enter-left";
}

export function removeCharacterAnimationClasses(image: HTMLImageElement): void {
  image.classList.remove(...CHARACTER_ANIMATION_CLASSES);
}

export function getStatRanges(characters: CharacterDefinition[]): StatRanges {
  return {
    hp: getRange(characters.map((character) => character.hp)),
    moveSpeed: getRange(characters.map((character) => character.moveSpeed)),
    jumpForce: getRange(characters.map((character) => character.jumpForce)),
  };
}

export function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

export function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1);
}

function buildStatSegmentsHtml(filledSegments: number): string {
  return Array.from({ length: STAT_SEGMENT_COUNT })
    .map((_, index) => {
      const className =
        index < filledSegments ? "character-stat-segment character-stat-segment-filled" : "character-stat-segment";

      return `<span class="${className}"></span>`;
    })
    .join("");
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

function getCharacterImageSrc(character: CharacterDefinition): string {
  return `/portraits/${character.kind}.png`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
