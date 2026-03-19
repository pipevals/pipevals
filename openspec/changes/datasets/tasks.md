## 1. Schema & Migration

- [x] 1.1 Add `datasets` and `datasetItems` table definitions to `lib/db/pipeline-schema.ts` with all columns, FKs, indexes, and relations
- [x] 1.2 Add `evalRuns` table definition to `lib/db/pipeline-schema.ts` with all columns, FKs, indexes, and relations
- [x] 1.3 Add nullable `evalRunId` column (FK to evalRuns, cascade delete) and index to `pipelineRuns` table; update pipelineRuns relations
- [x] 1.4 Generate and run drizzle migration

## 2. Dataset API

- [x] 2.1 Create `app/api/datasets/route.ts` with POST (create dataset) and GET (list datasets) handlers
- [x] 2.2 Create `app/api/datasets/[id]/route.ts` with GET (dataset + items), PUT (update metadata), DELETE handlers
- [x] 2.3 Create `app/api/datasets/[id]/items/route.ts` with POST (add items) handler
- [x] 2.4 Create `app/api/datasets/[id]/items/[itemId]/route.ts` with DELETE (remove item) handler
- [x] 2.5 Add dataset auth helper (verify dataset belongs to user's org) in `lib/api/auth.ts`

## 3. Eval Run API

- [x] 3.1 Create `app/api/pipelines/[id]/eval-runs/route.ts` with POST (trigger eval run) and GET (list eval runs) handlers
- [x] 3.2 Create `app/api/pipelines/[id]/eval-runs/[evalRunId]/route.ts` with GET (eval run detail + child runs) handler
- [x] 3.3 Create `app/api/pipelines/[id]/eval-runs/[evalRunId]/metrics/route.ts` with GET (aggregate metrics) handler
- [x] 3.4 Implement eval run status derivation logic (derive status from child pipeline run statuses)

## 4. Modified Pipeline APIs

- [x] 4.1 Update `GET /api/pipelines/[id]/runs` to filter by `evalRunId` query param (default: only ad-hoc runs where evalRunId is null)
- [x] 4.2 Update `GET /api/pipelines/[id]/runs/metrics` to accept optional `evalRunId` query param for scoping

## 5. Dataset UI

- [x] 5.1 Add "Datasets" link to `components/app-header.tsx` with active state
- [x] 5.2 Create dataset list page at `app/datasets/page.tsx` with server-side data fetching
- [x] 5.3 Create dataset list client component (`components/dataset/dataset-list.tsx`) with search filter, delete confirmation, and empty state
- [x] 5.4 Create dataset creation dialog component with name, description, and schema key builder
- [x] 5.5 Create dataset detail page at `app/datasets/[id]/page.tsx` with server-side data fetching
- [x] 5.6 Create dataset detail client component (`components/dataset/dataset-detail.tsx`) with items table, add-items JSON input, and per-item delete

## 6. Eval Run UI

- [x] 6.1 Create "Run Dataset" button and dataset picker dialog on the pipeline page
- [x] 6.2 Create eval runs list section/tab on the pipeline detail page (`components/pipeline/eval-run-list.tsx`)
- [x] 6.3 Create eval run detail page at `app/pipelines/[id]/eval-runs/[evalRunId]/page.tsx`
- [x] 6.4 Create eval run detail client component with progress bar, aggregate metrics, and per-item results table

## 7. Tests

- [ ] 7.1 Add API tests for dataset CRUD endpoints
- [ ] 7.2 Add API tests for eval run trigger, list, detail, and metrics endpoints
- [ ] 7.3 Add API tests for modified pipeline runs list (evalRunId filter) and metrics (evalRunId scoping)
