import type { EntityKind } from "@smashing-cats/protocol";

export function getPlayerModelPath(kind: EntityKind): string {
  return `/players/${kind}.glb`;
}

export function getEntityModelPath(type: string, kind: EntityKind): string {
  if (type === "obstacle") {
    return `/obstacles/${kind}.glb`;
  }

  if (type === "civilian") {
    return `/civilians/${kind}.glb`;
  }

  return `/enemies/${kind}.glb`;
}
