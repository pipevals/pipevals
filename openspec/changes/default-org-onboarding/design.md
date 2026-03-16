## Context

Today, when a new user registers via GitHub OAuth, they land with no organization. The app's `requireAuth()` helper enforces an active organization, so the user is immediately stuck — they must manually create an org before they can do anything. This is acceptable for production multi-tenancy but creates unnecessary friction for local development and product demos.

The existing `lib/db/seed.ts` is a stub with no seed data. The Better Auth config in `lib/auth.ts` uses the `organization` plugin but has no hooks. The `organization`, `member`, and `session` tables already support everything needed — no schema migration required.

## Goals / Non-Goals

**Goals:**
- A seed script that idempotently creates a well-known "Demo" organization (`slug: demo`) using the Better Auth SDK
- A Better Auth `databaseHooks.user.create.after` hook that auto-adds newly registered users as members of the demo org with a restricted `guest` role
- A custom `guest` role with read-only permissions so auto-invited users cannot call privileged org APIs from the client
- Both behaviors gated by hostname — only active when `BETTER_AUTH_URL` points to `localhost` or the project's own domain (hardcoded allowlist in code)
- Zero schema changes, zero new env vars

**Non-Goals:**
- Auto-creating sample pipelines or evaluation data (future work)
- Changing the production onboarding flow or org creation UI
- Supporting multiple default orgs

## Decisions

### 1. Domain-gated via `BETTER_AUTH_URL` hostname (no env var)

A hardcoded allowlist of hostnames controls both the seed and the hook:

```typescript
const AUTO_INVITE_HOSTS = new Set(["localhost"]);

function isAutoInviteEnabled(): boolean {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) return false;
  try {
    return AUTO_INVITE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
```

**Why not an env var?** Env vars can leak into production via misconfigured deploys or CI pipelines. A hardcoded allowlist requires a code change and deploy to modify, which is a stronger security boundary. The existing `BETTER_AUTH_URL` already tells us where the app is running — no new configuration surface.

### 2. Use Better Auth SDK for seeding (`auth.api.createOrganization`)

The seed script uses `auth.api.createOrganization` rather than raw Drizzle inserts. This ensures the org is created through Better Auth's own logic (ID generation, validation, metadata handling) and stays consistent with how the rest of the app manages organizations.

The seed imports the `auth` instance from `lib/auth.ts` and calls the server-side API directly. Idempotency is handled by checking for an existing org with the `demo` slug before attempting creation.

**Why not raw SQL / Drizzle?** Using the SDK keeps the seed aligned with Better Auth's internal model. If Better Auth changes how it stores organizations (e.g., adds required fields, changes ID format), the SDK call adapts automatically.

### 3. Use `databaseHooks.user.create.after` for auto-membership

Better Auth supports `databaseHooks` at the top level of the config. The `user.create.after` hook fires after a user row is inserted and receives the created user object. Inside this hook we insert a `member` row directly via Drizzle.

**Why not invitation-based?** The invitation flow requires an inviter user, sends emails, and the invitee must accept. For a local auto-join, direct member insertion is simpler and instant.

**Why direct Drizzle for the member row (not SDK)?** Inside `databaseHooks`, we don't have an authenticated request context needed by `auth.api.addMember`. Direct Drizzle insert for the `member` row avoids permission checks and is the standard pattern for database hooks.

### 4. Custom `guest` role via access control

Better Auth's default roles are `owner`, `admin`, and `member`. None are restrictive enough for auto-invited demo users — `member` still grants write access to org resources via the client API.

We define a `guest` role using Better Auth's static access control (`ac`) system:

```typescript
import { createAccessControl, defaultStatements } from "better-auth/plugins/access";

const statement = { ...defaultStatements };
const ac = createAccessControl(statement);

organization({
  ac,
  roles: {
    guest: ac.newRole({
      organization: ["read"],
    }),
  },
})
```

This gives guests the bare minimum — they can read the organization (needed to pass auth checks / set active org) but nothing else. No member listing, no invitation access, no write operations of any kind through Better Auth's client APIs.

**Why not dynamic access control?** Dynamic roles are stored in the DB and managed via API calls. For a single well-known role that never changes, static definition is simpler and doesn't require a DB migration for the roles table.

### 5. Well-known slug `demo`

The seed creates the org with `slug: "demo"`. The hook looks up the org by slug to get its ID, then inserts the member row. A single DB query per registration (only on allowed hosts) is negligible.

**Why look up by slug instead of hardcoding an ID?** Since we're using the Better Auth SDK for seeding, the org ID is generated by Better Auth (not deterministic). The slug is the stable well-known identifier.

## Risks / Trade-offs

- **Hook adds latency to sign-up**: One `SELECT` (org lookup) + one `INSERT` (member) per registration on allowed hosts. Negligible (~2ms) and only runs locally.
- **Slug collision**: If someone manually creates an org with slug `demo`, the seed will detect it already exists and skip. The hook would add new users to that manually-created org. Acceptable for local dev.
- **Guest role limits app-level access**: The `guest` role only restricts Better Auth's org APIs. Application-level authorization (e.g., who can create/edit pipelines) is enforced separately by the app — the guest role is not a substitute for that.
- **No automatic `activeOrganizationId` on session**: The hook fires on user creation, before the session is fully established. The user's first session won't have `activeOrganizationId` set automatically. The existing app UI handles org switching, so the user can select the demo org on first load.
- **Seed requires auth module**: The seed script imports `lib/auth.ts`, which validates `BETTER_AUTH_SECRET` and social provider env vars at import time. All auth-related env vars must be set when running the seed.
