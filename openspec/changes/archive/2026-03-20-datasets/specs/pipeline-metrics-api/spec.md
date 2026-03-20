## MODIFIED Requirements

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
