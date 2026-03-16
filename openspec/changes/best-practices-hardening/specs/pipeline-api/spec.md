## MODIFIED Requirements

### Requirement: Update pipeline graph
The system SHALL expose `PUT /api/pipelines/:id` to update a pipeline's metadata and full graph. The request body MUST accept name, description, nodes array, and edges array. Node IDs MUST be client-generated and stable — the system MUST upsert nodes (insert new, update existing, delete removed) rather than delete-all-and-recreate, preserving node IDs across edits. The system MUST validate the graph is a valid DAG before persisting. The update MUST be atomic — either the entire graph is saved or nothing changes. The system MUST execute independent database queries (node conflict checks, edge conflict checks) in parallel using `Promise.all` rather than sequentially.

#### Scenario: Save pipeline graph
- **WHEN** a user sends a PUT with updated nodes and edges that form a valid DAG
- **THEN** the system atomically upserts nodes and edges for that pipeline and returns 200

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

## ADDED Requirements

### Requirement: Server-side pipeline list fetching
The system SHALL fetch the pipeline list on the server in the pipelines page component and pass the data as props to the client component. The page MUST NOT rely on client-side `useEffect` fetching for the initial pipeline list.

#### Scenario: Pipeline list renders with data on first paint
- **WHEN** a user navigates to the pipelines page
- **THEN** the pipeline list is rendered with data from the server without a client-side fetch waterfall
