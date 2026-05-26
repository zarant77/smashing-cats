import { existsSync } from "node:fs";
import { resolve } from "node:path";

import Database from "better-sqlite3";
import type { LeaderboardMode } from "@smashing-cats/protocol";

type LeaderboardRow = {
  player_name: string;
  character_kind: string;
  duration_seconds: number;
  score: number;
  created_at: string;
};

const DATABASE_PATH = resolve("data/smashing-cats.sqlite");
const MODES: readonly LeaderboardMode[] = ["single", "multi"];

if (!existsSync(DATABASE_PATH)) {
  console.log(`Leaderboard database not found: ${DATABASE_PATH}`);
  process.exit(0);
}

const db = new Database(DATABASE_PATH, { readonly: true, fileMustExist: true });
const hasCharacterKind = hasColumn("character_kind");
const hasDurationSeconds = hasColumn("duration_seconds");

try {
  for (const mode of MODES) {
    printTopEntries(mode, getTopEntries(mode));
  }
} finally {
  db.close();
}

function getTopEntries(mode: LeaderboardMode): LeaderboardRow[] {
  const durationSelection = hasDurationSeconds ? "duration_seconds" : "0 AS duration_seconds";
  const characterSelection = hasCharacterKind ? "character_kind" : "'unknown' AS character_kind";

  return db
    .prepare(
      `
      SELECT player_name, ${characterSelection}, ${durationSelection}, score, created_at
      FROM leaderboard_entries
      WHERE mode = ?
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `,
    )
    .all(mode) as LeaderboardRow[];
}

function hasColumn(columnName: string): boolean {
  const columns = db.prepare("PRAGMA table_info(leaderboard_entries)").all() as Array<{ name: string }>;

  return columns.some((column) => column.name === columnName);
}

function printTopEntries(mode: LeaderboardMode, entries: readonly LeaderboardRow[]): void {
  console.log(`\n${mode.toUpperCase()} TOP 10`);

  if (entries.length === 0) {
    console.log("No entries.");
    return;
  }

  entries.forEach((entry, index) => {
    console.log(
      `${index + 1}. ${entry.player_name} | ${entry.character_kind} | ${formatDuration(entry.duration_seconds)} | ${entry.score} | ${entry.created_at}`,
    );
  });
}

function formatDuration(durationSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
