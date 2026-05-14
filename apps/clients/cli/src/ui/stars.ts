export function stars(value: number, max = 5): string {
  const safeValue = Math.max(0, Math.min(max, Math.round(value)));
  return `${"★".repeat(safeValue)}${"☆".repeat(max - safeValue)}`;
}
