import { existsSync } from "node:fs";
import { resolve } from "node:path";

import Database from "better-sqlite3";
import type { LeaderboardMode } from "@smashing-cats/protocol";

type LeaderboardRow = {
  player_name: string;
  character_kind: string;
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

try {
  for (const mode of MODES) {
    printTopEntries(mode, getTopEntries(mode));
  }
} finally {
  db.close();
}

function getTopEntries(mode: LeaderboardMode): LeaderboardRow[] {
  return db
    .prepare(
      `
      SELECT player_name, character_kind, score, created_at
      FROM leaderboard_entries
      WHERE mode = ?
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `,
    )
    .all(mode) as LeaderboardRow[];
}

function printTopEntries(mode: LeaderboardMode, entries: readonly LeaderboardRow[]): void {
  console.log(`\n${mode.toUpperCase()} TOP 10`);

  if (entries.length === 0) {
    console.log("No entries.");
    return;
  }

  entries.forEach((entry, index) => {
    console.log(
      `${index + 1}. ${entry.player_name} | ${entry.character_kind} | ${entry.score} | ${entry.created_at}`,
    );
  });
}
