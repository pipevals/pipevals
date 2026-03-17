## ADDED Requirements

### Requirement: Create pipeline
The system SHALL expose `POST /api/pipelines` to create a new pipeline. The request body MUST include name and optional description. The server MUST generate a slug from the name using the `slugify` utility and enforce slug uniqueness per organization via a DB constraint. The response MUST return the created pipeline with its id and slug. The pipeline MUST be scoped to the authenticated user's active organization.

#### Scenario: Create pipeline
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "GPT-4o Eval", "description": "Evaluate GPT-4o responses" }`
- **THEN** the system returns 201 with the created pipeline including its generated id and slug `"gpt-4o-eval"`

#### Scenario: Create pipeline with colliding slug
- **WHEN** an authenticated user sends `POST /api/pipelines` with a name whose slug already exists in the org
- **THEN** the system returns 409 with an error message

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

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
The system SHALL expose `PUT /api/pipelines/:id` to update a pipeline's metadata and full graph. The request body MUST accept name, description, nodes array, edges array, and an optional `triggerSchema` field (`Record<string, unknown>`). The system MUST validate that `triggerSchema`, if provided, is a plain JSON object (not an array). Node IDs MUST be client-generated and stable. The system MUST validate the graph is a valid DAG before persisting. The update MUST be atomic. The system MUST execute independent database queries in parallel using `Promise.all`.

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

### Requirement: Delete pipeline
The system SHALL expose `DELETE /api/pipelines/:id` to delete a pipeline and all its nodes, edges, runs, and step results via cascade.

#### Scenario: Delete pipeline
- **WHEN** an authenticated user sends `DELETE /api/pipelines/:id`
- **THEN** the pipeline and all related data are deleted and the system returns 204

### Requirement: Trigger pipeline run
The system SHALL expose `POST /api/pipelines/:id/runs` to trigger a new pipeline run. The request body MUST accept an optional trigger payload (JSON object). The endpoint MUST load the current pipeline graph, serialize it as the run's graph_snapshot, create a pipeline_run row, invoke the Vercel Workflow, and return the run id immediately (async execution). The graph_snapshot MUST capture the complete graph at trigger time so the run is isolated from subsequent pipeline edits.

#### Scenario: Trigger a run
- **WHEN** a user sends `POST /api/pipelines/:id/runs` with payload `{ "prompt": "explain quantum computing" }`
- **THEN** the system snapshots the current graph, creates a run with status `pending` and the snapshot, triggers the workflow, and returns 202 with `{ "runId": "..." }`

#### Scenario: Trigger run on empty pipeline
- **WHEN** a user triggers a run on a pipeline with no nodes
- **THEN** the system returns 400 indicating the pipeline has no nodes to execute

### Requirement: Get run status
The system SHALL expose `GET /api/pipelines/:pipelineId/runs/:runId` to retrieve a run's status, graph snapshot, and all step results. The response MUST include the run's status, trigger_payload, graph_snapshot (the graph as it was when the run was triggered), timestamps, and a step_results array with each node's status, input, output, error, and duration.

#### Scenario: Get running pipeline
- **WHEN** a user queries a run that is in progress with 3 of 5 steps completed
- **THEN** the system returns the run with status `running`, the graph_snapshot, 3 step_results with status `completed`, 1 with `running`, and 1 not yet present

#### Scenario: Get completed pipeline
- **WHEN** a user queries a completed run
- **THEN** the system returns the run with status `completed`, the graph_snapshot, and all step_results

### Requirement: List runs for a pipeline
The system SHALL expose `GET /api/pipelines/:id/runs` to list all runs for a pipeline, ordered by most recent first. The response MUST include each run's id, status, and timestamps.

#### Scenario: List runs
- **WHEN** a user lists runs for a pipeline that has been executed 10 times
- **THEN** the system returns 10 run summaries ordered by started_at descending

### Requirement: Server-side pipeline list fetching
The system SHALL fetch the pipeline list on the server in the pipelines page component and pass the data as props to the client component. The page MUST NOT rely on client-side `useEffect` fetching for the initial pipeline list.

#### Scenario: Pipeline list renders with data on first paint
- **WHEN** a user navigates to the pipelines page
- **THEN** the pipeline list is rendered with data from the server without a client-side fetch waterfall
