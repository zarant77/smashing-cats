import type { EntityKind } from "./entity.js";
import type { HurtCircle, Size } from "./snapshot.js";

export type CharacterDefinition = {
  kind: EntityKind;

  name: Record<"en" | "uk", string>;

  size: Size;
  hurt: HurtCircle;

  hp: number;

  moveSpeed: number;
  jumpForce: number;

  smashSpeed: number;
  smashMinJumpProgress: number;
};
