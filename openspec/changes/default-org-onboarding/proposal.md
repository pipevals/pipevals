## Why

New users who sign up for the platform land in a state where they have no organization and cannot evaluate pipelines. For local development and demos, this friction kills momentum — evaluators should be able to register and immediately start exploring the product with sample data. A default "Demo" organization, created via seed script and auto-joined on registration, removes this cold-start problem.

## What Changes

- **Seed script for default organization**: Extend `lib/db/seed.ts` to create a well-known default organization (slug `demo`) using the Better Auth SDK (`auth.api`), so it exists before any user signs up.
- **Auto-invite hook on registration**: Add a Better Auth `databaseHooks.user.create.after` hook that automatically adds the new user as a member of the default organization with a restricted `guest` role.
- **Custom `guest` role**: Define a `guest` role in the organization plugin's access control config with read-only permissions, preventing auto-invited users from calling privileged Better Auth client APIs (invite members, manage roles, delete org, etc.).
- **Domain-gated behavior**: Both the seed and the hook activate only when `BETTER_AUTH_URL` resolves to an allowed hostname (hardcoded: `localhost` and the project's own production domain). No new env vars — the gating is code-level, not configuration.

## Capabilities

### New Capabilities
- `default-org-seed`: Seed script logic that creates and idempotently maintains a default demo organization via the Better Auth SDK.
- `default-org-auto-invite`: Better Auth hook that auto-adds newly registered users to the default organization on allowed hosts with a restricted `guest` role.

### Modified Capabilities

_None — no existing spec-level requirements change._

## Impact

- **`lib/db/seed.ts`**: Gains seed logic using the Better Auth SDK to create the default org.
- **`lib/auth.ts`**: Adds a `databaseHooks.user.create.after` hook for auto-membership (gated by hostname), a custom `guest` role via access control config, and the role passed to the organization plugin.
- **`lib/db/auth-schema.ts`**: No schema changes — uses existing `organization` and `member` tables.
- **`.env` / `.env.example`**: No changes — uses existing `BETTER_AUTH_URL`.
- **Test setup**: Existing test helpers are unaffected; the hook only fires on allowed hosts.
