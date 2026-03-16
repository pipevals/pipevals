## Why

An audit against Vercel React, Next.js, and Better Auth best practices revealed 16 issues across security, performance, and UX. The most impactful: auth endpoints have no rate limiting, ReactFlow is statically imported adding significant bundle weight to every page, all data fetching happens client-side after hydration creating unnecessary waterfalls, and there are no error boundaries or loading states. Addressing these now prevents security exposure and establishes the right patterns before more features are built on top.

## What Changes

- Add rate limiting to Better Auth to protect sign-in/sign-up from brute force
- Add runtime validation for `BETTER_AUTH_SECRET` minimum length
- Configure the organization plugin with explicit limits (`organizationLimit`, `membershipLimit`)
- Switch Better Auth plugin imports to dedicated paths for tree-shaking
- Dynamically import ReactFlow canvases (pipeline editor + run viewer) with `next/dynamic`
- Parallelize sequential DB queries in the pipeline PUT route
- Memoize the `outputs` array in `ConditionNode` to avoid re-renders
- Add `error.tsx`, `not-found.tsx`, and `loading.tsx` for proper error boundaries and loading states
- Replace boilerplate root metadata with app-specific title/description
- Add `generateMetadata` on dynamic pipeline/run routes

## Capabilities

### New Capabilities
- `auth-hardening`: Rate limiting, secret validation, organization plugin configuration, and plugin tree-shaking for Better Auth
- `error-loading-ux`: Error boundaries, not-found pages, loading skeletons, and route-level metadata across the app

### Modified Capabilities
- `pipeline-api`: Parallelize sequential DB queries in the PUT upsert route
- `pipeline-builder-ui`: Dynamic import ReactFlow canvas, memoize ConditionNode outputs
- `pipeline-run-viewer`: Dynamic import RunViewerCanvas

## Impact

- **Auth**: `lib/auth.ts` — plugin config, rate limiting, secret validation
- **API routes**: `app/api/pipelines/[id]/route.ts` — parallel queries in PUT handler
- **Components**: `components/pipeline/canvas.tsx`, `run-viewer-canvas.tsx`, `nodes/index.tsx` — dynamic imports, memoization
- **App shell**: `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/pipelines/**/loading.tsx` — error boundaries, loading states, metadata
- **Dependencies**: None new. All changes use existing packages.
