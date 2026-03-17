import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin, bearer, testUtils } from "better-auth/plugins";
import type { TestHelpers } from "better-auth/plugins";
import * as schema from "@/lib/db/schema";
import { guestRole, createGuestHooks } from "@/lib/auth-guest";
import { runMigrations } from "@/lib/__tests__/run-migrations";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function createAuth(db: DrizzleDb, baseURL = "http://localhost:3000") {
  return betterAuth({
    secret: "test-secret-at-least-32-characters-long",
    baseURL,
    database: drizzleAdapter(db, { provider: "pg" }),
    plugins: [organization(), admin(), bearer(), testUtils()],
  });
}

type TestAuth = ReturnType<typeof createAuth>;

// Module-level cache: Bun isolates modules per test file, so each file that
// imports this module gets its own in-memory database. Within a single file,
// repeated calls to setupTestDb() reuse the same instance to avoid redundant
// migration and auth initialization overhead.
const _cache = new Map<
  string,
  { pg: PGlite; db: DrizzleDb; auth: TestAuth; test: TestHelpers }
>();


export async function setupTestDb(): Promise<{
  pg: PGlite;
  db: DrizzleDb;
  auth: TestAuth;
  test: TestHelpers;
}> {
  const cacheKey = "default";
  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  const pg = new PGlite();
  const db = drizzle({ client: pg, schema });
  await runMigrations(pg);

  const auth = createAuth(db);
  const ctx = (await auth.$context) as { test: TestHelpers };
  const test = ctx.test;

  const result = { pg, db, auth, test };
  _cache.set(cacheKey, result);
  return result;
}

export type GuestTestContext = {
  pg: PGlite;
  db: DrizzleDb;
  auth: ReturnType<typeof createAuthWithGuestHooks>;
  test: TestHelpers;
};

function createAuthWithGuestHooks(db: DrizzleDb, baseURL: string) {
  return betterAuth({
    secret: "test-secret-at-least-32-characters-long",
    baseURL,
    database: drizzleAdapter(db, { provider: "pg" }),
    hooks: createGuestHooks(db),
    plugins: [
      organization({ roles: { guest: guestRole } }),
      admin(),
      bearer(),
      testUtils(),
    ],
  });
}

// Same isolation guarantee as _cache above. Keyed by baseURL so that test
// files that need distinct auth instances can pass different URLs.
const _guestCache = new Map<string, GuestTestContext>();

export async function setupGuestTestDb(baseURL: string): Promise<GuestTestContext> {
  const cached = _guestCache.get(baseURL);
  if (cached) return cached;

  const pg = new PGlite();
  const db = drizzle({ client: pg, schema });
  await runMigrations(pg);

  const auth = createAuthWithGuestHooks(db, baseURL);
  const ctx = (await auth.$context) as { test: TestHelpers };
  const test = ctx.test;

  const result = { pg, db, auth, test };
  _guestCache.set(baseURL, result);
  return result;
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
