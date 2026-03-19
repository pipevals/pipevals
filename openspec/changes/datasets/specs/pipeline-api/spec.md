## MODIFIED Requirements

### Requirement: List runs for a pipeline
The system SHALL expose `GET /api/pipelines/:id/runs` to list all runs for a pipeline, ordered by most recent first. The response MUST include each run's id, status, and timestamps. The endpoint MUST accept an optional `evalRunId` query parameter. When `evalRunId` is provided, the response MUST only include runs belonging to that eval run. When `evalRunId` is not provided, the response MUST only include runs where `evalRunId` is null (ad-hoc runs), to avoid mixing eval run items with single-trigger runs.

#### Scenario: List ad-hoc runs only
- **WHEN** a user lists runs for a pipeline without specifying `evalRunId`
- **THEN** the system returns only runs where `evalRunId` is null, ordered by most recent first

#### Scenario: List runs for an eval run
- **WHEN** a user lists runs with `?evalRunId=eval-123`
- **THEN** the system returns only runs belonging to eval run `eval-123`

#### Scenario: List runs (no ad-hoc runs exist)
- **WHEN** a pipeline has only eval-run-triggered runs and the user lists runs without `evalRunId`
- **THEN** the system returns an empty array
