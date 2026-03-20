## Why

All organization members — including guests — can currently perform every action (create, update, delete pipelines, datasets, templates, runs, tasks). The guest role only restricts Better Auth's own `/organization/*` management routes. This violates least-privilege principles and means demo/viewer users can mutate production data.

## What Changes

- Enhance `requireAuth()` to fetch and return the caller's organization role from the `member` table
- Add a `{ write: true }` option to `requireAuth()`, `requirePipeline()`, and `requireDataset()` that returns 403 for guests
- Apply `{ write: true }` to all 14 mutation endpoints (POST/PUT/DELETE) across pipelines, datasets, templates, runs, eval-runs, and tasks
- Pass role from server components to pages and disable mutation UI (buttons, forms) for guests
- Update `requireSessionWithOrg()` to return `role` for page-level UI gating

## Capabilities

### New Capabilities
- `org-role-gating`: Server-side role check in route handler auth helpers that blocks guest users from mutation endpoints
- `guest-read-only-ui`: Client-side UI degradation that disables mutation controls (buttons, forms) when the active member role is guest

### Modified Capabilities
- `pipeline-api`: Mutation endpoints (POST, PUT, DELETE) now require non-guest role
- `dataset-api`: Mutation endpoints (POST, PUT, DELETE, item add/delete) now require non-guest role
- `template-api`: Mutation endpoints (POST, DELETE) now require non-guest role
- `eval-run-api`: POST endpoint now requires non-guest role
- `review-tasks`: Task submit endpoint now requires non-guest role

## Impact

- **`lib/api/auth.ts`**: Core change — `requireAuth`, `requirePipeline`, `requireDataset`, `requireSessionWithOrg` all gain role awareness
- **14 route handlers**: Each mutation handler switches from `requireAuth()` to `requireAuth({ write: true })` (or equivalent via `requirePipeline`/`requireDataset`)
- **Pages with mutation UI**: `/pipelines`, `/pipelines/[id]`, `/pipelines/[id]/tasks`, `/datasets`, `/datasets/[id]` need conditional rendering
- **No DB schema changes** — role already exists on `member` table
- **No new dependencies**
