export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomInt(v1: number, v2: number): number {
  const min = Math.min(v1, v2);
  const max = Math.max(v1, v2);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}
