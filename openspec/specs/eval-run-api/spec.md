### Requirement: Eval run schema table
The system SHALL define an `eval_run` table with columns: `id` (text PK, auto-generated UUID), `pipelineId` (text FK to pipeline, cascade delete, not null), `datasetId` (text FK to dataset, cascade delete, not null), `status` (text enum: pending/running/completed/failed, default "pending", not null), `totalItems` (integer, not null — count of dataset items at trigger time), `completedItems` (integer, default 0, not null), `failedItems` (integer, default 0, not null), `createdAt` (timestamp, default now), `startedAt` (timestamp, nullable), `completedAt` (timestamp, nullable). The table MUST have indexes on `pipelineId` and `datasetId`.

#### Scenario: Table exists after migration
- **WHEN** the database migration runs
- **THEN** the `eval_run` table exists with all specified columns, constraints, and indexes

### Requirement: Pipeline run eval run FK
The `pipeline_run` table MUST gain a nullable `evalRunId` column (text FK to eval_run, cascade delete). Existing runs MUST have `evalRunId = null`. An index MUST be added on `evalRunId`.

#### Scenario: Existing runs unaffected
- **WHEN** the migration adds the `evalRunId` column
- **THEN** all existing pipeline_run rows have `evalRunId = null` and continue to function normally

### Requirement: Trigger eval run
The system SHALL expose `POST /api/pipelines/:id/eval-runs` to trigger an evaluation run. The request body MUST include `datasetId` (string). The endpoint SHALL require write permission and return 403 for guest users. The endpoint MUST:
1. Load the pipeline with its current graph and triggerSchema
2. Load the dataset with its schema and all items
3. Validate that the dataset schema keys exactly match the pipeline triggerSchema keys; reject with 400 if they do not match
4. Validate the pipeline has executable nodes (non-trigger); reject with 400 if empty
5. Snapshot the graph once (same logic as single-run trigger)
6. Create an `eval_run` record with `totalItems` set to the dataset item count
7. For each dataset item, create a `pipeline_run` record with the item's `data` as `triggerPayload`, the shared `graphSnapshot`, and `evalRunId` set to the eval run's id
8. Start a Vercel Workflow for each pipeline run concurrently via `Promise.all`
9. Return 202 with the eval run id

#### Scenario: Guest tries to start eval run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/eval-runs`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Trigger eval run successfully
- **WHEN** an authenticated user sends `POST /api/pipelines/:id/eval-runs` with `{ "datasetId": "ds-123" }` and the dataset has 5 items with matching schema
- **THEN** the system creates an eval_run, 5 pipeline_runs (each with the corresponding item data as triggerPayload), starts 5 workflows, and returns 202 with `{ "evalRunId": "..." }`

#### Scenario: Schema mismatch
- **WHEN** the dataset schema keys do not exactly match the pipeline's triggerSchema keys
- **THEN** the system returns 400 with an error describing the mismatch

#### Scenario: Empty pipeline
- **WHEN** the pipeline has no executable nodes
- **THEN** the system returns 400 with an error indicating the pipeline has no nodes to execute

#### Scenario: Dataset not found
- **WHEN** the datasetId does not exist or belongs to a different organization
- **THEN** the system returns 404

#### Scenario: Empty dataset
- **WHEN** the dataset has 0 items
- **THEN** the system returns 400 with an error indicating the dataset has no items

### Requirement: List eval runs
The system SHALL expose `GET /api/pipelines/:id/eval-runs` to list all eval runs for a pipeline. The response MUST include each eval run's id, datasetId, status, totalItems, completedItems, failedItems, and timestamps. Results MUST be ordered by `createdAt` descending.

#### Scenario: List eval runs
- **WHEN** an authenticated user lists eval runs for a pipeline with 3 eval runs
- **THEN** the system returns 200 with 3 eval run summaries ordered by most recent first

#### Scenario: No eval runs
- **WHEN** a pipeline has no eval runs
- **THEN** the system returns 200 with an empty array

### Requirement: Get eval run detail
The system SHALL expose `GET /api/pipelines/:id/eval-runs/:evalRunId` to retrieve a single eval run with its per-item pipeline runs. The response MUST include the eval run metadata and a `runs` array containing each pipeline run's id, status, triggerPayload, and timestamps.

#### Scenario: Get eval run with completed items
- **WHEN** an authenticated user requests an eval run that has 5 pipeline runs (3 completed, 1 running, 1 pending)
- **THEN** the response includes the eval run with status "running", and the runs array with all 5 pipeline runs and their individual statuses

#### Scenario: Eval run not found
- **WHEN** a user requests an eval run id that doesn't exist
- **THEN** the system returns 404

### Requirement: Eval run metrics
The system SHALL expose `GET /api/pipelines/:id/eval-runs/:evalRunId/metrics` to retrieve aggregate metrics for an eval run. The response MUST follow the same shape as the existing pipeline metrics endpoint (`runs` array with per-run metrics), but filtered to only include runs belonging to the specified eval run. The response MUST also include a top-level `aggregate` object containing the mean of each numeric metric across all completed runs.

#### Scenario: Eval run metrics with completed runs
- **WHEN** an eval run has 3 completed pipeline runs with metric_capture outputs `{ relevance: 0.8 }`, `{ relevance: 0.9 }`, `{ relevance: 0.7 }`
- **THEN** the response includes a `runs` array with 3 entries and `aggregate: { relevance: 0.8 }`

#### Scenario: Eval run with no completed runs
- **WHEN** an eval run has no completed pipeline runs yet
- **THEN** the response includes an empty `runs` array and `aggregate: {}`

### Requirement: Eval run status derivation
The eval run status MUST be derived from its child pipeline runs: `pending` if no runs have started, `running` if any run is in progress, `completed` if all runs are completed, `failed` if any run has failed and no runs are still in progress. The `completedItems` and `failedItems` counters MUST be updated as individual runs complete.

#### Scenario: All runs complete
- **WHEN** all 5 pipeline runs for an eval run reach status "completed"
- **THEN** the eval run status is "completed" with completedItems=5, failedItems=0

#### Scenario: Some runs failed
- **WHEN** 3 of 5 pipeline runs complete and 2 fail
- **THEN** the eval run status is "failed" with completedItems=3, failedItems=2
