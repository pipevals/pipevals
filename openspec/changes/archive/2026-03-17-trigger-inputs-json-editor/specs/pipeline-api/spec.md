## MODIFIED Requirements

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

#### Scenario: Save pipeline with trigger schema
- **WHEN** a user sends a PUT with `{ nodes, edges, triggerSchema: { "prompt": "", "temperature": 0 } }`
- **THEN** the system persists `triggerSchema` and returns 200

#### Scenario: Reject array trigger schema
- **WHEN** a user sends a PUT with `triggerSchema: [{ "name": "prompt" }]`
- **THEN** the system returns 400 with a validation error

#### Scenario: Omit trigger schema preserves existing
- **WHEN** a user sends a PUT without a `triggerSchema` field
- **THEN** the existing `trigger_schema` in the database is preserved unchanged
