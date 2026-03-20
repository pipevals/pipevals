## ADDED Requirements

### Requirement: Metrics aggregation endpoint
The system SHALL expose a `GET /api/pipelines/:id/runs/metrics` endpoint that returns metric values and step durations for all completed runs of a pipeline. The endpoint MUST require authentication and verify the user has access to the pipeline's organization. The endpoint MUST accept an optional `evalRunId` query parameter. When `evalRunId` is provided, the response MUST only include runs belonging to that eval run. When `evalRunId` is not provided, the response MUST include all completed runs (both ad-hoc and eval-run runs) to preserve backward compatibility. The response MUST be a JSON object with a `runs` array.

#### Scenario: Fetch metrics for pipeline with completed runs
- **WHEN** an authenticated user requests `GET /api/pipelines/:id/runs/metrics` for a pipeline with completed runs
- **THEN** the response status is 200 and the body contains a `runs` array with one entry per completed run

#### Scenario: Fetch metrics scoped to eval run
- **WHEN** an authenticated user requests `GET /api/pipelines/:id/runs/metrics?evalRunId=eval-123`
- **THEN** the response only includes completed runs belonging to eval run `eval-123`

#### Scenario: Fetch metrics for pipeline with no completed runs
- **WHEN** an authenticated user requests `GET /api/pipelines/:id/runs/metrics` for a pipeline with no completed runs
- **THEN** the response status is 200 and the body contains an empty `runs` array

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated user requests the endpoint
- **THEN** the response status is 401

#### Scenario: Pipeline not found or unauthorized
- **WHEN** a user requests metrics for a pipeline they don't have access to
- **THEN** the response status is 404

### Requirement: Run metrics response shape
Each entry in the `runs` array MUST include: `id` (run ID), `status`, `createdAt`, `durationMs` (total run duration computed from `startedAt` and `completedAt`), `metrics` (object mapping metric names to their captured values), and `steps` (array of objects with `label` and `durationMs` for each executed step). The `metrics` object MUST be extracted from step results where the corresponding node in `graphSnapshot` has type `metric_capture`. If a run has no metric_capture results, `metrics` MUST be an empty object.

#### Scenario: Run with metric_capture output
- **WHEN** a completed run has a metric_capture step that output `{ metrics: { relevance: 0.87, coherence: 0.92 } }`
- **THEN** the run entry in the response contains `metrics: { relevance: 0.87, coherence: 0.92 }`

#### Scenario: Run with multiple metric_capture nodes
- **WHEN** a completed run has two metric_capture steps with outputs `{ metrics: { score: 8 } }` and `{ metrics: { latency: 1200 } }`
- **THEN** the run entry contains `metrics: { score: 8, latency: 1200 }` (merged)

#### Scenario: Step durations included
- **WHEN** a completed run has steps "Generator" (2300ms), "Judge" (1800ms), "Metrics" (100ms)
- **THEN** the run entry contains `steps: [{ label: "Generator", durationMs: 2300 }, { label: "Judge", durationMs: 1800 }, { label: "Metrics", durationMs: 100 }]`

#### Scenario: Run duration computation
- **WHEN** a completed run has `startedAt: "2026-03-18T10:00:00Z"` and `completedAt: "2026-03-18T10:00:05Z"`
- **THEN** the run entry contains `durationMs: 5000`

### Requirement: Ordering
The endpoint MUST return runs ordered by `createdAt` ascending (oldest first) so that chart data is in chronological order.

#### Scenario: Chronological ordering
- **WHEN** a pipeline has runs created at T1, T3, T2
- **THEN** the response returns them in order T1, T2, T3
