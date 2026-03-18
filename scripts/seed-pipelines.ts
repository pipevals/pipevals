import "dotenv/config";
import { parseArgs } from "util";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { seedPipelines, seedPipelineDefinitions } from "../lib/db/seed-pipelines";
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
    console.error(`Seed pipeline "${def.name}" has invalid graph:`);
    for (const err of result.errors) {
      console.error(`  - [${err.code}] ${err.message}`);
    }
    process.exit(1);
  }
}

const { values } = parseArgs({
  options: {
    org: { type: "string", short: "o" },
    user: { type: "string", short: "u" },
  },
});

if (!values.org) {
  console.error("Usage: bun run scripts/seed-pipelines.ts --org <org-id-or-slug>");
  console.error("  --org, -o   Organization ID or slug (required)");
  console.error("  --user, -u  User ID for created_by (optional, defaults to first org member)");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  // Resolve org by ID or slug
  const org = await db.query.organization.findFirst({
    where: (o, { or, eq }) => or(eq(o.id, values.org!), eq(o.slug, values.org!)),
  });

  if (!org) {
    console.error(`Organization not found: ${values.org}`);
    process.exit(1);
  }

  // Resolve user
  let userId = values.user;
  if (!userId) {
    const firstMember = await db.query.member.findFirst({
      where: (m, { eq }) => eq(m.organizationId, org.id),
    });
    if (!firstMember) {
      console.error(`No members found in organization: ${org.name} (${org.id})`);
      process.exit(1);
    }
    userId = firstMember.userId;
  }

  console.log(`Seeding pipelines for org "${org.name}" (${org.id}), user: ${userId}`);

  await seedPipelines(db, org.id, userId);

  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
