## MODIFIED Requirements

### Requirement: Trigger pipeline run
The system SHALL expose `POST /api/pipelines/:id/runs` to trigger a new pipeline run. The request body MUST accept an optional trigger payload (JSON object). The endpoint MUST load the current pipeline graph, serialize it as the run's graph_snapshot, create a pipeline_run row, invoke the Vercel Workflow, and return the run id immediately (async execution). The graph_snapshot MUST capture the complete graph at trigger time so the run is isolated from subsequent pipeline edits. The endpoint SHALL accept authentication via either session cookies or a valid `x-api-key` header.

#### Scenario: Trigger a run
- **WHEN** a user sends `POST /api/pipelines/:id/runs` with payload `{ "prompt": "explain quantum computing" }`
- **THEN** the system snapshots the current graph, creates a run with status `pending` and the snapshot, triggers the workflow, and returns 202 with `{ "runId": "..." }`

#### Scenario: Trigger run on empty pipeline
- **WHEN** a user triggers a run on a pipeline with no nodes
- **THEN** the system returns 400 indicating the pipeline has no nodes to execute

#### Scenario: Trigger run via API key
- **WHEN** an external client sends `POST /api/pipelines/:id/runs` with a valid `x-api-key` header and the API key user is a non-guest member of the pipeline's organization
- **THEN** the system authenticates via API key, snapshots the graph, creates the run, and returns 202

#### Scenario: Trigger run via API key with invalid key
- **WHEN** an external client sends `POST /api/pipelines/:id/runs` with an invalid `x-api-key` header
- **THEN** the system returns 401
