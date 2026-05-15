export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

export function easeInCubic(value: number): number {
  return value * value * value;
}

export function easeOutBack(value: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

export function hashToUnit(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}
