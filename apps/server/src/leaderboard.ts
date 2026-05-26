import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import type { LeaderboardEntry, LeaderboardMode } from "@smashing-cats/protocol";

type LeaderboardRow = {
  id: string;
  mode: LeaderboardMode;
  player_name: string;
  character_kind: string;
  duration_seconds: number;
  score: number;
  created_at: string;
};

type InsertEntryOptions = {
  mode: LeaderboardMode;
  playerName: string;
  characterKind: string;
  durationSeconds: number;
  score: number;
};

const DATABASE_PATH = resolve("data/smashing-cats.sqlite");
const TOP_LIMIT = 10;

export class LeaderboardStore {
  private readonly db: Database.Database;

  public constructor(databasePath = DATABASE_PATH) {
    mkdirSync(dirname(databasePath), { recursive: true });

    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          player_name TEXT NOT NULL,
          character_kind TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          score INTEGER NOT NULL,
          created_at TEXT NOT NULL
        )
      `,
      )
      .run();
    this.migrateColumn("character_kind", "TEXT NOT NULL DEFAULT 'unknown'");
    this.migrateColumn("duration_seconds", "INTEGER NOT NULL DEFAULT 0");
    this.db.prepare("CREATE INDEX IF NOT EXISTS leaderboard_entries_mode_score_idx ON leaderboard_entries (mode, score DESC)").run();
  }

  public getTop(mode: LeaderboardMode): LeaderboardEntry[] {
    const rows = this.db
      .prepare<string>(
        `
        SELECT id, mode, player_name, character_kind, duration_seconds, score, created_at
        FROM leaderboard_entries
        WHERE mode = ?
        ORDER BY score DESC, created_at ASC
        LIMIT ${TOP_LIMIT}
      `,
      )
      .all(mode) as LeaderboardRow[];

    return rows.map(toLeaderboardEntry);
  }

  public isEligible(mode: LeaderboardMode, score: number): boolean {
    if (!Number.isInteger(score) || score <= 0) {
      return false;
    }

    const top = this.getTop(mode);

    if (top.length < TOP_LIMIT) {
      return true;
    }

    return score > top[top.length - 1]!.score;
  }

  public getEligiblePlace(mode: LeaderboardMode, score: number): number | undefined {
    if (!this.isEligible(mode, score)) {
      return undefined;
    }

    const row = this.db
      .prepare<[LeaderboardMode, number]>(
        `
        SELECT COUNT(*) AS count
        FROM leaderboard_entries
        WHERE mode = ? AND score >= ?
      `,
      )
      .get(mode, score) as { count: number } | undefined;

    return (row?.count ?? 0) + 1;
  }

  public insertEntry(options: InsertEntryOptions): LeaderboardEntry {
    const entry: LeaderboardEntry = {
      id: randomUUID(),
      mode: options.mode,
      playerName: sanitizePlayerName(options.playerName),
      characterKind: options.characterKind,
      durationSeconds: options.durationSeconds,
      score: options.score,
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `
        INSERT INTO leaderboard_entries (id, mode, player_name, character_kind, duration_seconds, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        entry.id,
        entry.mode,
        entry.playerName,
        entry.characterKind,
        entry.durationSeconds,
        entry.score,
        entry.createdAt,
      );

    return entry;
  }

  private migrateColumn(columnName: keyof LeaderboardRow, definition: string): void {
    const columns = this.db.prepare("PRAGMA table_info(leaderboard_entries)").all() as Array<{ name: string }>;

    if (columns.some((column) => column.name === columnName)) {
      return;
    }

    this.db.prepare(`ALTER TABLE leaderboard_entries ADD COLUMN ${columnName} ${definition}`).run();
  }
}

export const leaderboardStore = new LeaderboardStore();

export function sanitizePlayerName(playerName: string): string {
  const sanitized = playerName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .slice(0, 16);

  return sanitized === "" ? "PLAYER" : sanitized;
}

function toLeaderboardEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    id: row.id,
    mode: row.mode,
    playerName: row.player_name,
    characterKind: row.character_kind,
    durationSeconds: row.duration_seconds,
    score: row.score,
    createdAt: row.created_at,
  };
}
