## Context

All app API routes use `requireAuth()`, `requirePipeline()`, or `requireDataset()` from `lib/api/auth.ts`. These check for a valid session and active organization but do not inspect the member's role. The `member` table already stores `role` (values: `guest`, `member`, `owner`, `admin`). The guest role is only enforced on Better Auth's own `/organization/*` routes via a `before` hook in `lib/auth-guest.ts`.

Pages use `requireSessionWithOrg()` which also does not return role information.

## Goals / Non-Goals

**Goals:**
- Block guest users from all mutation API endpoints (POST, PUT, DELETE) with a 403
- Surface the member role in auth helpers so route handlers and pages can use it
- Disable mutation UI controls on pages for guests
- Keep the change minimal — no new tables, no new dependencies, no permission maps

**Non-Goals:**
- Fine-grained per-resource permissions (e.g., per-pipeline ACLs)
- Permission maps or policy engines — a simple `role === "guest"` check is sufficient
- New roles beyond the existing set (`guest`, `member`, `owner`, `admin`)
- Hiding pages from guests — they can still navigate everywhere, just can't mutate

## Decisions

### 1. Enforce in route handlers, not middleware/proxy

**Choice:** Add role checks inside `requireAuth()` / `requirePipeline()` / `requireDataset()`.

**Why not middleware/proxy:**
- CVE-2025-29927 allows bypassing Next.js middleware via a crafted header. The official guidance is to never rely on middleware as the sole auth layer.
- Next.js proxy cannot return JSON response bodies — only rewrite, redirect, or set headers. API 403s need a JSON error body.
- Route handlers already have the auth call; extending it is minimal.

### 2. Pass-through `{ write: true }` option instead of separate `requireAuthWrite()`

**Choice:** Add an optional `write` flag to existing helpers rather than creating new functions.

```
requireAuth()                     → returns { session, userId, organizationId, role }
requireAuth({ write: true })      → same, but 403 if role === "guest"
requirePipeline(id)               → read access
requirePipeline(id, { write: true }) → blocks guests
requireDataset(id)                → read access
requireDataset(id, { write: true })  → blocks guests
```

**Why:** Avoids double `getSession()` calls that would occur with a separate `requireAuthWrite()` + `requirePipeline()` pattern. Single code path, single auth call per request.

**Alternative considered:** Separate `requireAuthWrite()` function. Rejected because `requirePipeline` already wraps `requireAuth` internally — a separate write variant would either duplicate the pipeline lookup or require calling auth twice.

### 3. Fetch role via Drizzle member query, not `auth.api.getActiveMember()`

**Choice:** Query the `member` table directly in `requireAuth()` using the `userId` + `organizationId` already available from the session.

**Why:** Consistent with the existing pattern in `auth-guest.ts`. Avoids an extra round-trip through Better Auth's internal HTTP-style handler. One simple Drizzle query.

### 4. Server-side role prop for pages, not client-side fetch

**Choice:** `requireSessionWithOrg()` returns `role`, pages pass it as a prop to client components for conditional rendering.

**Why:** The role is already fetched server-side. Passing it as a prop avoids an extra client-side request to `/organization/get-active-member`. Simpler, faster, no loading states for role.

### 5. Disable (not hide) mutation UI for guests

**Choice:** Mutation buttons and forms render as `disabled` with a tooltip for guests, rather than being hidden.

**Why:** Transparent about capabilities. Guests understand the feature exists but they don't have access. Hiding creates confusion about missing features.

## Risks / Trade-offs

**[Extra DB query per request]** → `requireAuth()` now queries the `member` table on every call. This is one indexed lookup by `(userId, organizationId)`. The `member` table has indexes on both columns. Acceptable overhead.

**[Role check is binary, not extensible]** → The `write: true` flag is a simple guest check, not a permission system. If more roles with different capabilities are needed later, this will need rework. → Acceptable for current scope; YAGNI until proven otherwise.

**[UI can get out of sync]** → If a user's role changes mid-session, the server-rendered role prop won't update until page refresh. → Acceptable; role changes are rare admin actions, not real-time events.
