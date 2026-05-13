export function getEntityColor(type: string, alive: boolean): number {
  if (!alive) {
    return 0x555555;
  }

  if (type === "obstacle") {
    return 0x1e7f3e;
  }

  if (type === "civilian") {
    return 0x4aa3df;
  }

  return 0x8b3a3a;
}

export function getPlayerColor(isLocal: boolean, alive: boolean): number {
  if (!alive) {
    return 0x555555;
  }

  return isLocal ? 0xffcc33 : 0xf58ad4;
}
