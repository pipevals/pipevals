import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin, testUtils } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
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
    plugins: [organization(), admin(), apiKey({ apiKeyHeaders: ["x-api-key"] }), testUtils()],
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
      apiKey({ apiKeyHeaders: ["x-api-key"] }),
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

// ---------------------------------------------------------------------------
// Shared module mocks — call from every API test file instead of doing
// mock.module() directly. Since mock.module is global, the last call wins.
// By centralizing here, all files use the same mutable `activeHeaders` ref
// so auth-test files can set it to empty Headers while crud/runs files set
// it to authenticated headers — without conflicting.
// ---------------------------------------------------------------------------

import { mock } from "bun:test";

/**
 * Shared mutable state for the mock.module("next/headers") callback.
 * Uses an object ref so all closures (across files) see the same value,
 * even when mock.module is re-registered by different test files.
 */
export const headerState = { current: new Headers() };

export function setActiveHeaders(h: Headers) {
  headerState.current = h;
}

/**
 * Registers global mock.module() calls for the API test suite.
 * Safe to call from every test file — all files share the same PGlite
 * instance and the same headerState ref.
 */
export async function setupMocks() {
  const { db: testDb, auth: testAuth } = await setupTestDb();

  mock.module("next/headers", () => ({
    headers: () => Promise.resolve(headerState.current),
  }));

  mock.module("@/lib/auth", () => ({ auth: testAuth }));
  mock.module("@/lib/db", () => ({ db: testDb }));

  const mockWorkflowStart = mock(() =>
    Promise.resolve({ runId: `wf-${crypto.randomUUID()}` }),
  );
  const mockResumeHook = mock(() => Promise.resolve());
  mock.module("workflow/api", () => ({
    start: mockWorkflowStart,
    resumeHook: mockResumeHook,
  }));
  mock.module("@/lib/pipeline/walker/workflow", () => ({
    runPipelineWorkflow: () => {},
  }));

  // Mock the AI SDK to prevent ESM resolution failures when other test files
  // in the same Bun process trigger transitive imports of the "ai" package.
  mock.module("ai", () => ({
    generateText: mock(() =>
      Promise.resolve({ text: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
    ),
    generateObject: mock(() =>
      Promise.resolve({ object: {}, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
    ),
    gateway: mock(() => "mock-model"),
    jsonSchema: (s: unknown) => s,
  }));

  return { db: testDb, auth: testAuth, mockWorkflowStart, mockResumeHook };
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

/**
 * Creates a guest user in the given organization and returns
 * authenticated headers for that guest session.
 */
export async function createGuestInOrg(organizationId: string): Promise<{
  userId: string;
  headers: Headers;
}> {
  const { auth, test } = await setupTestDb();

  const user = test.createUser({ email: `guest-${crypto.randomUUID()}@example.com` });
  const savedUser = await test.saveUser(user);

  await test.addMember!({
    userId: savedUser.id,
    organizationId,
    role: "guest",
  });

  const loginResult = await test.login({ userId: savedUser.id });

  await (auth.api as any).setActiveOrganization({
    headers: loginResult.headers,
    body: { organizationId },
  });

  return {
    userId: savedUser.id,
    headers: loginResult.headers,
  };
}

/**
 * Creates an API key for a user and returns headers with the x-api-key set.
 * Requires the user to have a session (pass their login headers).
 */
export async function createApiKeyForUser(sessionHeaders: Headers): Promise<{
  key: string;
  apiKeyHeaders: Headers;
}> {
  const { auth } = await setupTestDb();

  const result = await (auth.api as any).createApiKey({
    headers: sessionHeaders,
    body: { name: "test-key" },
  });

  const key = result.key as string;
  const apiKeyHeaders = new Headers();
  apiKeyHeaders.set("x-api-key", key);

  return { key, apiKeyHeaders };
}
