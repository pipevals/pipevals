import { beforeAll, describe, expect, test } from "bun:test";
import { setupGuestTestDb } from "@/lib/pipeline/__tests__/api/setup";

const BASE = "http://test.local";

function orgUrl(endpoint: string) {
  return `${BASE}/api/auth/organization/${endpoint}`;
}

let guestCookie: string;
let guestOrgId: string;
let guestUserId: string;
let ownerCookie: string;
let handler: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const { auth, test: t } = await setupGuestTestDb(BASE);

  handler = (req) => auth.handler(req);

  // --- Setup guest user + org ---
  const guestUser = await t.saveUser(
    t.createUser({ email: "guest@test.com" }),
  );
  const guestOrg = await t.saveOrganization!(
    t.createOrganization!({ name: "Guest Org" }),
  );
  guestOrgId = guestOrg.id as string;
  guestUserId = guestUser.id;
  await t.addMember!({
    userId: guestUser.id,
    organizationId: guestOrgId,
    role: "guest",
  });
  const guestLogin = await t.login({ userId: guestUser.id });
  guestCookie = guestLogin.headers.get("cookie")!;
  await auth.api.setActiveOrganization({
    headers: guestLogin.headers,
    body: { organizationId: guestOrgId },
  });

  // --- Setup owner user + org ---
  const ownerUser = await t.saveUser(
    t.createUser({ email: "owner@test.com" }),
  );
  const ownerOrg = await t.saveOrganization!(
    t.createOrganization!({ name: "Owner Org" }),
  );
  const ownerOrgId = ownerOrg.id as string;
  await t.addMember!({
    userId: ownerUser.id,
    organizationId: ownerOrgId,
    role: "owner",
  });
  const ownerLogin = await t.login({ userId: ownerUser.id });
  ownerCookie = ownerLogin.headers.get("cookie")!;
  await auth.api.setActiveOrganization({
    headers: ownerLogin.headers,
    body: { organizationId: ownerOrgId },
  });
});

describe("guest role: whitelisted endpoints (should succeed)", () => {
  test("set-active returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("set-active"), {
        method: "POST",
        headers: {
          cookie: guestCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ organizationId: guestOrgId }),
      }),
    );
    expect(res.status).toBe(200);
  });

  test("get-full-organization returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("get-full-organization"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("list returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("list"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("guest role: whitelisted read endpoints (should succeed)", () => {
  test("get-active-member returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("get-active-member"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("get-active-member-role returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("get-active-member-role"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("guest role: non-whitelisted read endpoints (should 403)", () => {
  test("list-members is blocked", async () => {
    const res = await handler(
      new Request(orgUrl("list-members"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(403);
  });

  test("list-invitations is blocked", async () => {
    const res = await handler(
      new Request(orgUrl("list-invitations"), {
        headers: { cookie: guestCookie },
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("guest role: write endpoints (should 403)", () => {
  test("create-invitation is blocked", async () => {
    const res = await handler(
      new Request(orgUrl("invite-member"), {
        method: "POST",
        headers: {
          cookie: guestCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "someone@test.com",
          role: "member",
          organizationId: guestOrgId,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  test("remove-member is blocked", async () => {
    const res = await handler(
      new Request(orgUrl("remove-member"), {
        method: "POST",
        headers: {
          cookie: guestCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ memberIdOrEmail: guestUserId }),
      }),
    );
    expect(res.status).toBe(403);
  });

  test("update-member-role is blocked", async () => {
    const res = await handler(
      new Request(orgUrl("update-member-role"), {
        method: "POST",
        headers: {
          cookie: guestCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ memberId: guestUserId, role: "member" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("non-guest member: same endpoints succeed (sanity check)", () => {
  test("list-members returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("list-members"), {
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("get-full-organization returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("get-full-organization"), {
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(200);
  });

  test("get-active-member returns 200", async () => {
    const res = await handler(
      new Request(orgUrl("get-active-member"), {
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(200);
  });
});
