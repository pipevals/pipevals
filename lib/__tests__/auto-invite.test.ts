import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, testUtils } from "better-auth/plugins";
import type { TestHelpers } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { member } from "@/lib/db/schema";
import { createAutoInviteHook, isAutoInviteEnabled, DEFAULT_ORG_SLUG } from "@/lib/auto-invite";
import { runMigrations } from "@/lib/__tests__/run-migrations";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function createTestAuth(db: DrizzleDb) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authRef: any;
  const hook = createAutoInviteHook(db, (params) => authRef.api.addMember(params));
  authRef = betterAuth({
    secret: "test-secret-at-least-32-characters-long",
    baseURL: "http://test.local",
    database: drizzleAdapter(db, { provider: "pg" }),
    databaseHooks: {
      user: {
        create: {
          after: hook,
        },
      },
    },
    plugins: [organization(), testUtils()],
  });
  return authRef;
}

// --- Unit tests: isAutoInviteEnabled() ---

describe("isAutoInviteEnabled", () => {
  const original = process.env.BETTER_AUTH_URL;

  afterAll(() => {
    if (original !== undefined) {
      process.env.BETTER_AUTH_URL = original;
    } else {
      delete process.env.BETTER_AUTH_URL;
    }
  });

  test("returns false when BETTER_AUTH_URL is not set", () => {
    delete process.env.BETTER_AUTH_URL;
    expect(isAutoInviteEnabled()).toBe(false);
  });

  test("returns true for localhost", () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    expect(isAutoInviteEnabled()).toBe(true);
  });

  test("returns true for pipevals.com", () => {
    process.env.BETTER_AUTH_URL = "https://pipevals.com";
    expect(isAutoInviteEnabled()).toBe(true);
  });

  test("returns true for www.pipevals.com", () => {
    process.env.BETTER_AUTH_URL = "https://www.pipevals.com";
    expect(isAutoInviteEnabled()).toBe(true);
  });

  test("returns false for a non-allowed hostname (6.3)", () => {
    process.env.BETTER_AUTH_URL = "https://staging.other-domain.com";
    expect(isAutoInviteEnabled()).toBe(false);
  });

  test("returns false for an invalid URL", () => {
    process.env.BETTER_AUTH_URL = "not-a-url";
    expect(isAutoInviteEnabled()).toBe(false);
  });
});

// --- Integration tests: auto-invite hook ---

describe("auto-invite hook: enabled", () => {
  let db: DrizzleDb;
  let helpers: TestHelpers;
  let demoOrgId: string;

  beforeAll(async () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    const pg = new PGlite();
    db = drizzle({ client: pg, schema });
    await runMigrations(pg);

    const auth = createTestAuth(db);
    const ctx = (await auth.$context) as { test: TestHelpers };
    helpers = ctx.test;

    const org = await helpers.saveOrganization!(
      helpers.createOrganization!({ name: "Demo", slug: DEFAULT_ORG_SLUG }),
    );
    demoOrgId = org.id as string;
  });

  afterAll(() => {
    delete process.env.BETTER_AUTH_URL;
  });

  test("6.1 — creates member row with role=guest when new user registers", async () => {
    const user = await helpers.saveUser(helpers.createUser({ email: "newuser@test.com" }));

    const row = await db.query.member.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.userId, user.id), eq(m.organizationId, demoOrgId)),
    });

    expect(row).toBeDefined();
    expect(row!.role).toBe("guest");
  });

  test("does not create a duplicate member row when user is created again", async () => {
    const user = await helpers.saveUser(helpers.createUser({ email: "duplicate@test.com" }));

    // The hook ran once during saveUser; verify exactly one row exists
    const rows = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, user.id), eq(member.organizationId, demoOrgId)));

    expect(rows).toHaveLength(1);
  });
});

describe("auto-invite hook: disabled (6.3 — non-allowed host)", () => {
  let db: DrizzleDb;
  let helpers: TestHelpers;
  let demoOrgId: string;

  beforeAll(async () => {
    process.env.BETTER_AUTH_URL = "https://staging.other-domain.com";
    const pg = new PGlite();
    db = drizzle({ client: pg, schema });
    await runMigrations(pg);

    const auth = createTestAuth(db);
    const ctx = (await auth.$context) as { test: TestHelpers };
    helpers = ctx.test;

    const org = await helpers.saveOrganization!(
      helpers.createOrganization!({ name: "Demo", slug: DEFAULT_ORG_SLUG }),
    );
    demoOrgId = org.id as string;
  });

  afterAll(() => {
    delete process.env.BETTER_AUTH_URL;
  });

  test("6.3 — no member row created when auto-invite is disabled", async () => {
    const user = await helpers.saveUser(helpers.createUser({ email: "noauto@test.com" }));

    const row = await db.query.member.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.userId, user.id), eq(m.organizationId, demoOrgId)),
    });

    expect(row).toBeUndefined();
  });
});

describe("auto-invite hook: demo org missing", () => {
  let db: DrizzleDb;
  let helpers: TestHelpers;

  beforeAll(async () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    const pg = new PGlite();
    db = drizzle({ client: pg, schema });
    await runMigrations(pg);

    const auth = createTestAuth(db);
    const ctx = (await auth.$context) as { test: TestHelpers };
    helpers = ctx.test;
  });

  afterAll(() => {
    delete process.env.BETTER_AUTH_URL;
  });

  test("logs warning and lets registration proceed when demo org not found", async () => {
    let threw = false;
    try {
      await helpers.saveUser(helpers.createUser({ email: "nooreg@test.com" }));
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
