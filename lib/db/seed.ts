import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

async function seed() {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);


  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
