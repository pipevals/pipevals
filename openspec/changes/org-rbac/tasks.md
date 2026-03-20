## 1. Auth Helpers — Role Awareness

- [x] 1.1 Enhance `requireAuth()` in `lib/api/auth.ts` to query the `member` table and return `role` in the result. Accept optional `{ write: true }` option that returns 403 for guests.
- [x] 1.2 Update `requirePipeline()` signature to accept `{ write: true }` option (replacing the `withGraph` boolean with an options object) and gate on guest role when set.
- [x] 1.3 Update `requireDataset()` signature to accept `{ write: true }` option and gate on guest role when set.
- [x] 1.4 Update `requireSessionWithOrg()` to query member role and return it alongside session, user, and organizationId.

## 2. Route Handlers — Apply Write Gating

- [ ] 2.1 `POST /api/pipelines` — use `requireAuth({ write: true })`
- [ ] 2.2 `PUT /api/pipelines/[id]` — use `requirePipeline(id, { write: true })`
- [ ] 2.3 `DELETE /api/pipelines/[id]` — use `requirePipeline(id, { write: true })`
- [ ] 2.4 `POST /api/pipelines/[id]/runs` — use `requirePipeline(id, { write: true })`
- [ ] 2.5 `POST /api/pipelines/[id]/runs/[runId]/cancel` — use `requirePipeline(id, { write: true })`
- [ ] 2.6 `POST /api/pipelines/[id]/eval-runs` — use `requirePipeline(id, { write: true })`
- [ ] 2.7 `POST /api/datasets` — use `requireAuth({ write: true })`
- [ ] 2.8 `PUT /api/datasets/[id]` — use `requireDataset(id, { write: true })`
- [ ] 2.9 `DELETE /api/datasets/[id]` — use `requireDataset(id, { write: true })`
- [ ] 2.10 `POST /api/datasets/[id]/items` — use `requireDataset(id, { write: true })`
- [ ] 2.11 `DELETE /api/datasets/[id]/items/[itemId]` — use `requireDataset(id, { write: true })`
- [ ] 2.12 `POST /api/templates` — use `requireAuth({ write: true })`
- [ ] 2.13 `DELETE /api/templates/[id]` — use `requireAuth({ write: true })`
- [ ] 2.14 `POST /api/tasks/[id]/submit` — use `requireAuth({ write: true })`

## 3. Pages — Pass Role and Disable Mutation UI

- [ ] 3.1 `/pipelines` page — pass `role` from `requireSessionWithOrg()`, disable "New Pipeline" button for guests
- [ ] 3.2 `/pipelines/[id]` page — pass `role`, disable save, node add, and delete controls for guests
- [ ] 3.3 `/pipelines/[id]/tasks` page — pass `role`, disable task submit button for guests
- [ ] 3.4 `/datasets` page — pass `role` from `requireSessionWithOrg()`, disable "New Dataset" button for guests
- [ ] 3.5 `/datasets/[id]` page — pass `role`, disable edit name, add item, and delete item controls for guests

## 4. Tests

- [ ] 4.1 Add unit tests for `requireAuth({ write: true })` — verify guest gets 403, member passes
- [ ] 4.2 Add unit tests for `requirePipeline(id, { write: true })` — verify guest gets 403
- [ ] 4.3 Add unit tests for `requireDataset(id, { write: true })` — verify guest gets 403
