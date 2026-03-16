## 1. Domain Gate Helper

- [ ] 1.1 Create an `isAutoInviteEnabled()` helper (in `lib/auth.ts` or a shared module) that parses `BETTER_AUTH_URL`, extracts the hostname, and checks it against a hardcoded `AUTO_INVITE_HOSTS` set (`localhost`)
- [ ] 1.2 Export the well-known slug constant `DEFAULT_ORG_SLUG = "demo"` alongside the helper

## 2. Guest Role — Access Control Config

- [ ] 2.1 Define a static access control config using `createAccessControl` and `defaultStatements` from `better-auth/plugins/access`
- [ ] 2.2 Add a `guest` role via `ac.newRole()` with read-only permission on `organization` only (no `member` or `invitation` access)
- [ ] 2.3 Pass the `ac` and `roles` config to the `organization()` plugin in `lib/auth.ts`

## 3. Seed Script — Default Organization via Better Auth SDK

- [ ] 3.1 Update `lib/db/seed.ts` to import `auth` from `lib/auth` and call `auth.api.createOrganization` to create the demo org (`name: "Demo"`, `slug: "demo"`), gated behind `isAutoInviteEnabled()`
- [ ] 3.2 Before creating, check if the org already exists (query by slug); skip creation if it does
- [ ] 3.3 Add logging — print whether the org was created or already existed
- [ ] 3.4 Run `bun run db:seed` and verify the org appears in the database; run it again to confirm idempotency

## 4. Auth Hook — Auto-Membership on Registration

- [ ] 4.1 Add `databaseHooks.user.create.after` to the Better Auth config in `lib/auth.ts`, gated behind `isAutoInviteEnabled()`
- [ ] 4.2 In the hook, look up the demo org by `DEFAULT_ORG_SLUG`, then insert a `member` row with `role: "guest"` using Drizzle, with conflict handling so duplicates are ignored
- [ ] 4.3 Wrap the logic in a try/catch — if the demo org doesn't exist (seed not run), log a warning and let registration proceed

## 5. Verification

- [ ] 5.1 With `BETTER_AUTH_URL=http://localhost:3000` and the seed run, register a new user via GitHub OAuth and verify the `member` row is created with `role = "guest"` for the demo org
- [ ] 5.2 Verify the guest user can read the organization (set active org) but cannot call member/invitation endpoints (listMembers, inviteMember, updateMemberRole, etc.)
- [ ] 5.3 With `BETTER_AUTH_URL` set to a non-allowed host, register a new user and verify no automatic membership is created
