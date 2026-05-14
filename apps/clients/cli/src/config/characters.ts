import charactersData from "@smashing-cats/core/config/characters.json" with { type: "json" };

export type CliCharacter = {
  kind: string;
  hp: number;
  moveSpeed: number;
  jumpForce: number;
};

type CharactersConfig = {
  characters: CliCharacter[];
};

const config = charactersData as CharactersConfig;

export const CLI_CHARACTERS = config.characters;
