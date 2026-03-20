## ADDED Requirements

### Requirement: Create pipeline
The system SHALL expose `POST /api/pipelines` to create a new pipeline. The request body MUST include `name` and optional `description`. The request body MAY include an optional `templateId` (string). The server MUST generate a slug from the name using the `slugify` utility and enforce slug uniqueness per organization via a DB constraint. When `templateId` is provided, the system SHALL:
1. Fetch the template and verify it is visible to the user (built-in or same org)
2. Copy the template's `triggerSchema` into the new pipeline
3. Generate fresh UUIDs for all nodes and edges from the template's `graphSnapshot`, remapping edge `sourceNodeId` and `targetNodeId` references to the new node UUIDs
4. Insert the pipeline, nodes, and edges atomically in a single transaction

The response MUST return the created pipeline with its id and slug. The pipeline MUST be scoped to the authenticated user's active organization. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to create pipeline
- **WHEN** a guest user sends `POST /api/pipelines`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Create pipeline from template
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "My Eval", "templateId": "abc-123" }` and template `abc-123` exists and is visible
- **THEN** the system returns 201 with the created pipeline, pre-populated with the template's nodes, edges, and trigger schema (all with fresh UUIDs)

#### Scenario: Create pipeline with invalid template ID
- **WHEN** an authenticated user sends `POST /api/pipelines` with a `templateId` that does not exist or is not visible to the user
- **THEN** the system returns 404 with an error message

#### Scenario: Create pipeline without template
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "GPT-4o Eval" }` and no `templateId`
- **THEN** the system returns 201 with an empty pipeline (no nodes or edges), same as current behavior

#### Scenario: Create pipeline with colliding slug
- **WHEN** an authenticated user sends `POST /api/pipelines` with a name whose slug already exists in the org
- **THEN** the system returns 409 with an error message

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

#### Scenario: Fresh UUIDs in created pipeline
- **WHEN** a pipeline is created from a template and another pipeline is created from the same template
- **THEN** both pipelines have completely different node and edge IDs with no collisions

### Requirement: List pipelines
The system SHALL expose `GET /api/pipelines` to list all pipelines in the authenticated user's active organization. The response MUST include each pipeline's id, name, slug, description, and timestamps.

#### Scenario: List pipelines
- **WHEN** an authenticated user sends `GET /api/pipelines` and their organization has 3 pipelines
- **THEN** the system returns 200 with an array of 3 pipeline objects each containing a `slug` field

### Requirement: Get pipeline with graph
The system SHALL expose `GET /api/pipelines/:id` to retrieve a pipeline with its full graph (nodes and edges). The response MUST include the pipeline metadata (including `slug`) plus `nodes` and `edges` arrays. The response shape MUST be directly consumable by xyflow. The response MUST include a `triggerSchema` field of type `Record<string, unknown>` (defaulting to `{}` when the stored value is null, `[]`, or not a plain object).

#### Scenario: Get pipeline with nodes and edges
- **WHEN** an authenticated user requests a pipeline that has 4 nodes and 3 edges
- **THEN** the system returns 200 with pipeline metadata including `slug`, a nodes array of 4 items, an edges array of 3 items, and a `triggerSchema` object

#### Scenario: Pipeline with null trigger schema
- **WHEN** a pipeline has `trigger_schema = null` in the database
- **THEN** the response includes `triggerSchema: {}`

#### Scenario: Pipeline not found
- **WHEN** a user requests a pipeline id that doesn't exist or belongs to another organization
- **THEN** the system returns 404

### Requirement: Update pipeline graph
The system SHALL expose `PUT /api/pipelines/:id` to update a pipeline's metadata and full graph. The request body MUST accept name, description, nodes array, edges array, and an optional `triggerSchema` field (`Record<string, unknown>`). Each node in the nodes array MAY include an optional `slug` field (string or null). The system MUST validate that `triggerSchema`, if provided, is a plain JSON object (not an array). Node IDs MUST be client-generated and stable. The system MUST validate the graph is a valid DAG before persisting. The system MUST validate node slugs using the shared `validateNodeSlugs` function — returning 400 with error details on failure. The update MUST be atomic. The system MUST execute independent database queries in parallel using `Promise.all`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to update pipeline
- **WHEN** a guest user sends `PUT /api/pipelines/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Save pipeline graph
- **WHEN** a user sends a PUT with updated nodes and edges that form a valid DAG
- **THEN** the system atomically upserts nodes and edges for that pipeline and returns 200

#### Scenario: Save pipeline with trigger schema
- **WHEN** a user sends a PUT with `{ nodes, edges, triggerSchema: { "prompt": "", "temperature": 0 } }`
- **THEN** the system persists `triggerSchema` and returns 200

#### Scenario: Reject array trigger schema
- **WHEN** a user sends a PUT with `triggerSchema: [{ "name": "prompt" }]`
- **THEN** the system returns 400 with a validation error

#### Scenario: Omit trigger schema preserves existing
- **WHEN** a user sends a PUT without a `triggerSchema` field
- **THEN** the existing `trigger_schema` in the database is preserved unchanged

#### Scenario: Stable node IDs across edits
- **WHEN** a user changes a node's config but keeps the same node ID
- **THEN** the node row is updated in place, preserving its ID

#### Scenario: Reject invalid graph
- **WHEN** a user sends a PUT with edges that form a cycle
- **THEN** the system returns 400 with a validation error and no changes are persisted

#### Scenario: Reject oversized graph
- **WHEN** a user sends a PUT with more than 50 nodes
- **THEN** the system returns 400 with an error indicating the node limit

#### Scenario: Parallel conflict detection
- **WHEN** the system checks for node ID and edge ID conflicts during upsert
- **THEN** both queries execute concurrently rather than sequentially

#### Scenario: Reject duplicate node slugs
- **WHEN** a user sends a PUT with two nodes both having slug `"generator"`
- **THEN** the system returns 400 with an error indicating the duplicate slug

#### Scenario: Reject invalid slug format
- **WHEN** a user sends a PUT with a node having slug `"Model A"` (invalid format)
- **THEN** the system returns 400 with an error indicating the invalid slug format

#### Scenario: Accept null slugs
- **WHEN** a user sends a PUT with nodes that have null slugs
- **THEN** the system accepts the request without slug validation errors

#### Scenario: Node slug is persisted
- **WHEN** a user sends a PUT with a node having slug `"scorer"`
- **THEN** the node's slug is persisted in the database and returned in subsequent GET responses

### Requirement: Delete pipeline
The system SHALL expose `DELETE /api/pipelines/:id` to delete a pipeline and all its nodes, edges, runs, and step results via cascade. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to delete pipeline
- **WHEN** a guest user sends `DELETE /api/pipelines/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Delete pipeline
- **WHEN** an authenticated user sends `DELETE /api/pipelines/:id`
- **THEN** the pipeline and all related data are deleted and the system returns 204

### Requirement: Trigger pipeline run
The system SHALL expose `POST /api/pipelines/:id/runs` to trigger a new pipeline run. The request body MUST accept an optional trigger payload (JSON object). The endpoint MUST load the current pipeline graph, serialize it as the run's graph_snapshot, create a pipeline_run row, invoke the Vercel Workflow, and return the run id immediately (async execution). The graph_snapshot MUST capture the complete graph at trigger time so the run is isolated from subsequent pipeline edits. The endpoint SHALL accept authentication via either session cookies or a valid `x-api-key` header. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to start run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/runs`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

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

### Requirement: Cancel pipeline run
The system SHALL allow authenticated users to cancel a running pipeline via `POST /api/pipelines/:id/runs/:runId/cancel`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to cancel run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/runs/[runId]/cancel`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Get run status
The system SHALL expose `GET /api/pipelines/:pipelineId/runs/:runId` to retrieve a run's status, graph snapshot, and all step results. The response MUST include the run's status, trigger_payload, graph_snapshot (the graph as it was when the run was triggered), timestamps, and a step_results array with each node's status, input, output, error, and duration.

#### Scenario: Get running pipeline
- **WHEN** a user queries a run that is in progress with 3 of 5 steps completed
- **THEN** the system returns the run with status `running`, the graph_snapshot, 3 step_results with status `completed`, 1 with `running`, and 1 not yet present

#### Scenario: Get completed pipeline
- **WHEN** a user queries a completed run
- **THEN** the system returns the run with status `completed`, the graph_snapshot, and all step_results

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

### Requirement: Server-side pipeline list fetching
The system SHALL fetch the pipeline list on the server in the pipelines page component and pass the data as props to the client component. The page MUST NOT rely on client-side `useEffect` fetching for the initial pipeline list.

#### Scenario: Pipeline list renders with data on first paint
- **WHEN** a user navigates to the pipelines page
- **THEN** the pipeline list is rendered with data from the server without a client-side fetch waterfall
