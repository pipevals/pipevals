import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin, bearer, testUtils } from "better-auth/plugins";
import type { TestHelpers } from "better-auth/plugins";
import * as schema from "@/lib/db/schema";
import { readFileSync } from "fs";
import { join } from "path";

function createAuth(db: ReturnType<typeof drizzle>) {
  return betterAuth({
    secret: "test-secret-at-least-32-characters-long",
    baseURL: "http://localhost:3000",
    database: drizzleAdapter(db, { provider: "pg" }),
    plugins: [organization(), admin(), bearer(), testUtils()],
  });
}

type TestAuth = ReturnType<typeof createAuth>;

let _pg: PGlite;
let _db: ReturnType<typeof drizzle>;
let _auth: TestAuth;
let _test: TestHelpers;

export async function setupTestDb() {
  if (_db) return { pg: _pg, db: _db, auth: _auth, test: _test };

  _pg = new PGlite();
  _db = drizzle({ client: _pg, schema });

  const migrationSql = readFileSync(
    join(process.cwd(), "drizzle/0000_fair_toxin.sql"),
    "utf-8",
  );

  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await _pg.exec(stmt);
  }

  _auth = createAuth(_db);

  const ctx = await _auth.$context as { test: TestHelpers };
  _test = ctx.test;

  return { pg: _pg, db: _db, auth: _auth, test: _test };
}

export interface TestContext {
  db: ReturnType<typeof drizzle>;
  auth: TestAuth;
  test: TestHelpers;
  userId: string;
  organizationId: string;
  headers: Headers;
}

/**
 * Creates a test user with an active organization and returns
 * authenticated headers ready for API calls.
 */
export async function createAuthenticatedUser(): Promise<TestContext> {
  const { db, auth, test } = await setupTestDb();

  const user = test.createUser({ email: `test-${crypto.randomUUID()}@example.com` });
  const savedUser = await test.saveUser(user);

  const org = test.createOrganization!({ name: "Test Org" });
  const savedOrg = await test.saveOrganization!(org);
  const orgId = savedOrg.id as string;

  await test.addMember!({
    userId: savedUser.id,
    organizationId: orgId,
    role: "owner",
  });

  const loginResult = await test.login({ userId: savedUser.id });

  // Set the active organization on this session — mutates the session row in DB,
  // so subsequent getSession calls with the same cookie see the active org.
  // Plugin-contributed API methods aren't visible to TS on the inferred auth type.
  await (auth.api as any).setActiveOrganization({
    headers: loginResult.headers,
    body: { organizationId: orgId },
  });

  return {
    db,
    auth,
    test,
    userId: savedUser.id,
    organizationId: orgId,
    headers: loginResult.headers,
  };
}
