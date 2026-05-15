import type { EntityKind } from "./entity.js";
import { HurtCircle, Size, SmashBox } from "./geometry.js";

export type CharacterDefinition = {
  kind: EntityKind;

  name: Record<"en" | "uk", string>;

  size: Size;
  hurt: HurtCircle;
  smash: SmashBox;

  hp: number;

  moveSpeed: number;
  jumpForce: number;

  smashSpeed: number;
  smashMinJumpProgress: number;
};
