import type { EntityKind } from "./entity.js";

export type CharacterDefinition = {
  kind: EntityKind;
  name: Record<"en" | "uk", string>;
  width: number;
  height: number;
  hp: number;
  moveSpeed: number;
  jumpForce: number;
  smashSpeed: number;
  smashMinJumpProgress: number;
};
