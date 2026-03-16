## Context

Pipevals is an LLM evaluation platform built with Next.js 16, Better Auth (GitHub OAuth + organizations), Drizzle ORM on PostgreSQL, xyflow for pipeline editing, and zustand for client state. An audit against Vercel React, Next.js, and Better Auth best practices found 16 issues ranging from critical (no auth rate limiting, heavy static imports, client-side data waterfalls) to low (missing metadata, `.env.example` docs). The codebase is functionally correct but lacks hardening that production use requires.

The auth layer uses Better Auth with the organization, admin, and bearer plugins. All pipeline API routes check session + org ownership but have no rate limiting or RBAC. The UI imports ReactFlow statically in every pipeline page, and all data fetching happens client-side via `useEffect` after hydration. There are no error boundaries, not-found pages, or loading states.

## Goals / Non-Goals

**Goals:**

- Protect auth endpoints from brute-force attacks with rate limiting
- Fail fast on misconfigured secrets at startup
- Set explicit organization and membership limits
- Reduce initial bundle size by dynamically importing ReactFlow canvases
- Eliminate the client-side data fetching waterfall for the pipeline list page
- Add proper error boundaries, not-found pages, and loading skeletons
- Set meaningful page metadata for each route
- Parallelize sequential DB queries in the pipeline PUT route
- Fix re-render waste in ConditionNode

**Non-Goals:**

- Full RBAC implementation (role-based permission checks per route) — worth doing but a separate change with its own design considerations
- Moving pipeline editor or run viewer data fetching to server components — these are heavily interactive xyflow-based UIs where the entire component tree is client-side; server-fetching the data would require a significant refactor of the store/loader pattern for marginal benefit since the data is always needed on the client anyway
- Real-time updates via WebSockets (replacing polling) — future work
- Adding `React.cache()` wrappers — no shared fetch layer exists yet between server components and API routes; premature until server-side data fetching is more prevalent

## Decisions

### 1. In-memory rate limiting for auth

**Decision**: Configure Better Auth's built-in `rateLimit` with `storage: "memory"`, 10 requests per 60-second window.

**Why over Redis/database storage**: The app is single-instance for now. In-memory rate limiting is zero-config, zero-latency, and sufficient until horizontal scaling requires shared state. When scaling arrives, switching to `storage: "secondary-storage"` with Redis is a one-line change.

**Why 10/60s**: Generous enough for legitimate use (sign-in retries, OAuth redirects) but blocks brute-force attempts. Can be tuned per-endpoint later.

### 2. Runtime secret validation at module load

**Decision**: Add a top-of-module check in `lib/auth.ts` that throws if `BETTER_AUTH_SECRET` is unset or shorter than 32 characters.

**Why over build-time validation**: Environment variables are injected at runtime in most deployment environments (Vercel, Docker). Build-time checks would pass with placeholder values and miss the real problem. A thrown error at import time prevents the app from starting with a weak secret.

**Alternative considered**: A middleware check on every request. Rejected because it adds per-request overhead for an invariant that should hold for the process lifetime.

### 3. Dynamic imports for ReactFlow canvases with `next/dynamic`

**Decision**: Wrap `PipelineCanvas` and `RunViewerCanvas` with `next/dynamic({ ssr: false })` at their usage sites (`pipeline-editor.tsx` and `run-viewer.tsx`). The canvas components themselves remain unchanged.

**Why `ssr: false`**: ReactFlow requires browser APIs (DOM measurements, ResizeObserver). SSR would fail or produce meaningless output. Disabling SSR avoids hydration mismatches and lets the module load only when the component mounts.

**Why at usage site, not in the component**: The component file stays a normal React component, testable without dynamic import wrappers. The usage site controls the loading boundary and can provide a skeleton fallback.

### 4. Server-side data fetching for the pipeline list page only

**Decision**: Move pipeline list fetching to the server component (`app/pipelines/page.tsx`) and pass data as props to `PipelineList`. Keep the pipeline editor and run viewer using client-side fetching.

**Why only the list page**: The list page is a simple data display — fetch, render, done. Moving this server-side eliminates one full client roundtrip. The editor and run viewer are deeply interactive xyflow UIs where the entire component tree is `"use client"`. Their zustand stores manage bidirectional sync between xyflow's internal state and the API. Refactoring them to accept server-fetched initial data would require restructuring the store initialization pattern for marginal benefit.

**Alternative considered**: Server-fetch for all pages. Rejected because the editor/viewer stores call `set()` on mount to initialize xyflow state — passing data as props would require a "hydrate store from props" pattern that adds complexity without eliminating the client-side fetch (the store still needs to refetch on save/poll).

### 5. Parallelize PUT route queries with Promise.all

**Decision**: Run `nodeConflicts` and `edgeConflicts` queries concurrently in the pipeline PUT handler using `Promise.all`.

**Why**: Both queries are independent reads against different tables. Running them sequentially adds one unnecessary DB round-trip of latency per save operation. `Promise.all` is a one-line change with zero risk.

### 6. Error and loading UI using Next.js conventions

**Decision**: Add `app/error.tsx` (root error boundary), `app/not-found.tsx` (custom 404), and `loading.tsx` files for pipeline routes. Use simple, styled components consistent with the existing shadcn/Tailwind design.

**Why root-level error boundary**: Catches unhandled errors anywhere in the app. Route-specific error boundaries can be added later for more granular recovery.

**Why `loading.tsx` for pipeline routes**: Next.js automatically wraps the page in a `Suspense` boundary using `loading.tsx` as the fallback. This provides instant loading feedback for the pipeline list (which will now be server-fetched) and for any future server-side data fetching in nested routes.

### 7. Memoize ConditionNode outputs with useMemo

**Decision**: Wrap the `handles.map(...)` call in `ConditionNode` with `useMemo`, keyed on the `handles` array reference.

**Why**: xyflow re-renders nodes frequently during pan/zoom/drag. Creating new arrays and objects on every render triggers unnecessary child re-renders of `BaseNode` and its `Handle` components. `useMemo` is a minimal, targeted fix.

## Risks / Trade-offs

**[In-memory rate limiting resets on deploy]** → On each Vercel deployment, the rate limit counters reset. An attacker could time attempts around deploys. Mitigation: acceptable for current scale. Upgrade to Redis-backed storage when adding `secondaryStorage`.

**[Dynamic imports add a loading flash]** → Users see a brief skeleton/spinner before ReactFlow loads. Mitigation: provide meaningful loading fallbacks (a canvas-sized skeleton with the same background color). The trade-off is worthwhile — users who never visit the editor don't pay the bundle cost at all.

**[Server-side pipeline list fetch may feel slower for cached data]** → With client-side fetching, the shell renders instantly and data appears after. With server-side fetching, the entire page waits for data (unless streaming). Mitigation: `loading.tsx` provides an instant skeleton, and streaming via Suspense makes the transition smooth. Net UX is better because the data appears in a single paint rather than a flash of empty state.

## Open Questions

- **Organization `sendInvitationEmail`**: Should we configure a real email handler now, or is it sufficient to set limits without email? Depends on whether invitations are used yet.
- **Per-route error boundaries**: Should `app/pipelines/error.tsx` be separate from `app/error.tsx` for more specific recovery? Can be added incrementally.
