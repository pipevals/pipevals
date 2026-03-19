import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { seedPipelineDefinitions, seedTemplates } from "../lib/db/seed-templates";
import { validateGraph } from "../lib/pipeline/graph-validation";

// Validate all seed definitions at startup (fail fast)
for (const def of seedPipelineDefinitions) {
  const nodes = def.nodes.map((n) => ({ id: n.id, type: n.type, config: n.config }));
  const edges = def.edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.sourceNodeId,
    sourceHandle: e.sourceHandle,
    targetNodeId: e.targetNodeId,
    targetHandle: e.targetHandle,
  }));
  const result = validateGraph(nodes, edges);
  if (!result.valid) {
    console.error(`Seed template "${def.name}" has invalid graph:`);
    for (const err of result.errors) {
      console.error(`  - [${err.code}] ${err.message}`);
    }
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  console.log("Seeding built-in pipeline templates...");

  await seedTemplates(db);

  await sql.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
