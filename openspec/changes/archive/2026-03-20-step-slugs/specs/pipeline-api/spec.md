## MODIFIED Requirements

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
