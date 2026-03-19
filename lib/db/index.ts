import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const sql = postgres(process.env.DATABASE_URL!, {
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 20,
});

export const db = drizzle(sql, { schema });
