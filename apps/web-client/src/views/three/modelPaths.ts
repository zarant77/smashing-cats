import type { EntityKind } from "@smashing-cats/protocol";

export function getPlayerModelPath(kind: EntityKind): string {
  return `/3d/players/${kind}.glb`;
}

export function getEntityModelPath(type: string, kind: EntityKind): string {
  if (type === "obstacle") {
    return `/3d/obstacles/${kind}.glb`;
  }

  if (type === "civilian") {
    return `/3d/civilians/${kind}.glb`;
  }

  return `/3d/enemies/${kind}.glb`;
}
