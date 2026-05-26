const TOP_LEADERBOARD_LIMIT = 10;

export function formatDuration(durationSeconds: number): string {
  const totalSeconds = Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isTop10Place(place: number): boolean {
  return Number.isInteger(place) && place >= 1 && place <= TOP_LEADERBOARD_LIMIT;
}
