export function stars(value: number, max = 5): string {
  const safeValue = Math.max(0, Math.min(max, Math.round(value)));
  return `${"★".repeat(safeValue)}${"☆".repeat(max - safeValue)}`;
}

export function relativeStars(value: number, min: number, max: number): string {
  const MAX_STARS = 5;

  if (max <= min) {
    return "★".repeat(MAX_STARS);
  }

  if (value <= min) {
    return `★${"☆".repeat(MAX_STARS - 1)}`;
  }

  if (value >= max) {
    return "★".repeat(MAX_STARS);
  }

  const ratio = (value - min) / (max - min);
  const filled = 1 + Math.ceil(ratio * (MAX_STARS - 1));

  return `${"★".repeat(filled)}${"☆".repeat(MAX_STARS - filled)}`;
}
