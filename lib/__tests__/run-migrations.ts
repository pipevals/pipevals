import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
import { join } from "path";

interface JournalEntry {
  tag: string;
}

export async function runMigrations(pg: PGlite) {
  const journal = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf-8"),
  ) as { entries: JournalEntry[] };

  for (const { tag } of journal.entries) {
    const sql = readFileSync(join(process.cwd(), `drizzle/${tag}.sql`), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await pg.exec(stmt);
    }
  }
}
