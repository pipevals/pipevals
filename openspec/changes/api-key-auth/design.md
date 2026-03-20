## Context

All API endpoints use cookie-based sessions via Better Auth's `nextCookies()` plugin. Auth is centralized in `lib/api/auth.ts` through `requireAuth()` and `requirePipeline()`, which resolve sessions, check organization membership, enforce role-based write access, and verify resource ownership. Pipeline runs need to be triggerable from CI systems and SDKs that cannot maintain browser cookies.

## Goals / Non-Goals

**Goals:**
- Enable programmatic access to `POST /api/pipelines/:id/runs` via API keys
- Keep all other endpoints cookie-only by default (whitelist approach)
- Reuse existing authorization logic (org membership, guest blocking, pipeline ownership)
- Demonstrate per-key rate limiting configuration

**Non-Goals:**
- API key management UI (future work)
- API key scoped permissions beyond membership role (the admin plugin's RBAC is sufficient for now)
- Supporting API keys on all endpoints

## Decisions

### 1. Use Better Auth `apiKey` plugin over custom token implementation

The `@better-auth/api-key` plugin provides key generation, hashing, verification, rate limiting, expiration, and enable/disable — all out of the box. It stores keys in a managed `apiKey` table and integrates with Better Auth's existing user model.

**Alternative considered:** Custom API key table + middleware. Rejected because it duplicates what the plugin provides and wouldn't benefit from upstream improvements.

### 2. User-scoped keys with organization inferred from the resource

Keys are tied to users (`references: "user"`), not organizations. When a request arrives with an API key:

1. Verify the key via `auth.api.verifyApiKey()` → get `userId`
2. Look up the target pipeline → get `organizationId`
3. Query the `member` table to verify the user belongs to that org and has a non-guest role

This avoids requiring an `x-organization-id` header, keeping the external API surface minimal. The caller only needs the API key and the pipeline ID.

**Alternative considered:** Organization-scoped keys. Rejected because user-scoped keys provide a clear audit trail (who triggered the run) and the user wants to use system users for CI, which naturally maps to user-scoped keys.

### 3. Whitelist via opt-in flag in auth helpers

Add an `apiKey` boolean to the options accepted by `requireAuth()` and `requirePipeline()`. When `apiKey: true`:

- If an `x-api-key` header is present, resolve the key instead of looking for cookies
- If no `x-api-key` header is present, fall back to cookie auth as normal

When `apiKey` is not set (default):

- Ignore the `x-api-key` header entirely, even if present
- This prevents API keys from being silently accepted on endpoints that weren't designed for it

The auth flow in `requireAuth()` becomes:

```
requireAuth({ apiKey: true, write: true })
  │
  ├─ x-api-key header present?
  │   ├─ YES → verifyApiKey() → userId
  │   │        (skip activeOrganizationId check — will be inferred later)
  │   │        return { session: null, userId, organizationId: null, fromApiKey: true }
  │   │
  │   └─ NO → getSession(headers) → existing cookie flow
  │
  └─ apiKey option not set?
      └─ getSession(headers) → existing cookie flow (ignore x-api-key)
```

For `requirePipeline()`, the org inference happens after auth:

```
requirePipeline(id, { withGraph: true, write: true, apiKey: true })
  │
  ├─ requireAuth({ apiKey: true, write: true })
  │     → returns authResult (may have organizationId: null if from API key)
  │
  ├─ if authResult.fromApiKey && !authResult.organizationId:
  │     → look up pipeline by ID (without org scoping)
  │     → get pipeline.organizationId
  │     → verify membership(userId, organizationId)
  │     → check role !== "guest" (if write: true)
  │     → set authResult.organizationId = pipeline.organizationId
  │
  └─ else: existing flow (pipeline scoped to activeOrganizationId)
```

### 4. Default `x-api-key` header

Use the plugin's default `x-api-key` header. This is the most common convention for API keys and avoids confusion with `Authorization: Bearer` which typically implies OAuth/JWT tokens.

### 5. Rate limiting configuration

Configure per-key rate limiting in the plugin:
- 60 requests per 60-second window (1 req/sec sustained)
- This is in addition to Better Auth's global rate limiting (100 req/10s)
- Per-key limits prevent a single integration from monopolizing capacity

## Risks / Trade-offs

**[Risk] Pipeline lookup without org scoping for API key requests** → For API key auth, we look up the pipeline by ID alone (not scoped to org) before verifying membership. This is safe because we verify membership immediately after, and the pipeline ID is a UUID (not guessable). The only information leaked to a non-member is whether a UUID exists, which is not meaningful.

**[Risk] API key plugin adds a new database table** → The `apiKey` table is managed by Better Auth's migration tooling. Running `npx @better-auth/cli@latest generate` will produce a Drizzle migration. This is additive-only (new table) with no impact on existing tables.

**[Risk] `getSession()` may auto-resolve API keys** → If the apiKey plugin hooks into `getSession()` automatically, non-whitelisted routes could inadvertently accept API keys. The whitelist check in `requireAuth()` must explicitly reject API key sessions when `apiKey: true` is not passed. Need to verify during implementation whether the plugin hooks into `getSession()` or provides a separate verification path.

## Open Questions

- Does the `apiKey` plugin hook into `getSession()` automatically, or is `verifyApiKey()` a separate call? This determines whether the whitelist needs to detect and reject API key sessions vs. simply not calling `verifyApiKey()`.
