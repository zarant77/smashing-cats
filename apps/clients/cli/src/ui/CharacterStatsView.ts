import type { Translator } from "@smashing-cats/i18n";
import type { CliCharacter } from "../config/characters.js";
import { CLI_CHARACTERS } from "../config/characters.js";
import { relativeStars } from "./stars.js";

type CharacterStatRange = {
  min: number;
  max: number;
};

export class CharacterStatsView {
  private readonly hpRange = this.getRange((character) => character.hp);
  private readonly speedRange = this.getRange((character) => character.moveSpeed);
  private readonly jumpRange = this.getRange((character) => character.jumpForce);

  public render(character: CliCharacter, t: Translator): string {
    return [
      ` ${t("hp")}`,
      ` ${relativeStars(character.hp, this.hpRange.min, this.hpRange.max)}`,
      "",
      ` ${t("speed")}`,
      ` ${relativeStars(character.moveSpeed, this.speedRange.min, this.speedRange.max)}`,
      "",
      ` ${t("jump")}`,
      ` ${relativeStars(character.jumpForce, this.jumpRange.min, this.jumpRange.max)}`,
    ].join("\n");
  }

  private getRange(select: (character: CliCharacter) => number): CharacterStatRange {
    const values = CLI_CHARACTERS.map(select);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}
