## MODIFIED Requirements

### Requirement: Get pipeline with graph
The system SHALL expose `GET /api/pipelines/:id` to retrieve a pipeline with its full graph (nodes and edges). The response MUST include the pipeline metadata (including `slug` and `triggerSchema`) plus `nodes` and `edges` arrays. The response shape MUST be directly consumable by xyflow (nodes with id, type, position, data; edges with id, source, target, sourceHandle, targetHandle). The `triggerSchema` field MUST default to `[]` when null in the database.

#### Scenario: Get pipeline with nodes and edges
- **WHEN** an authenticated user requests a pipeline that has 4 nodes and 3 edges
- **THEN** the system returns 200 with pipeline metadata including `slug`, a nodes array of 4 items, an edges array of 3 items, and a `triggerSchema` array

#### Scenario: Pipeline not found
- **WHEN** a user requests a pipeline id that doesn't exist or belongs to another organization
- **THEN** the system returns 404

#### Scenario: triggerSchema defaults to empty array
- **WHEN** a pipeline has never had a trigger schema set (null in DB)
- **THEN** `GET /api/pipelines/:id` returns `"triggerSchema": []`

### Requirement: Update pipeline graph
The system SHALL expose `PUT /api/pipelines/:id` to update a pipeline's metadata and full graph. The request body MUST accept name, description, nodes array, edges array, and an optional `triggerSchema` array. Node IDs MUST be client-generated and stable — the system MUST upsert nodes (insert new, update existing, delete removed) rather than delete-all-and-recreate, preserving node IDs across edits. The system MUST validate the graph is a valid DAG before persisting (trigger nodes and trigger edges MUST be excluded from DAG validation). The update MUST be atomic — either the entire graph is saved or nothing changes. The system MUST execute independent database queries (node conflict checks, edge conflict checks) in parallel using `Promise.all` rather than sequentially.

#### Scenario: Save pipeline graph with trigger schema
- **WHEN** a user sends a PUT with updated nodes, edges, and `"triggerSchema": [{ "name": "prompt" }]`
- **THEN** the system atomically upserts nodes, edges, and trigger schema for that pipeline and returns 200

#### Scenario: Stable node IDs across edits
- **WHEN** a user changes a node's config but keeps the same node ID
- **THEN** the node row is updated in place, preserving its ID

#### Scenario: Reject invalid graph
- **WHEN** a user sends a PUT with edges that form a cycle (excluding trigger edges)
- **THEN** the system returns 400 with a validation error and no changes are persisted

#### Scenario: Reject oversized graph
- **WHEN** a user sends a PUT with more than 50 nodes (excluding the trigger node)
- **THEN** the system returns 400 with an error indicating the node limit

#### Scenario: Parallel conflict detection
- **WHEN** the system checks for node ID and edge ID conflicts during upsert
- **THEN** both queries execute concurrently rather than sequentially

#### Scenario: PUT without triggerSchema preserves existing schema
- **WHEN** a user sends a PUT that omits the `triggerSchema` field
- **THEN** the existing trigger schema is left unchanged
