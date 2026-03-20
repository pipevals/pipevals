## ADDED Requirements

### Requirement: Pipeline entity
The system SHALL store pipelines with an id, name, optional description, organization_id, created_by user reference, and timestamps (created_at, updated_at). Pipeline names MUST be unique within an organization.

#### Scenario: Create a pipeline
- **WHEN** a user creates a pipeline with name "GPT-4o Eval" in their organization
- **THEN** the system persists a pipeline row with a generated id, the given name, the user's organization_id, the user's id as created_by, and current timestamps

#### Scenario: Duplicate name within organization
- **WHEN** a user creates a pipeline with a name that already exists in the same organization
- **THEN** the system rejects the creation with a conflict error

### Requirement: Pipeline nodes
The system SHALL store pipeline nodes with an id, pipeline_id (foreign key), type enum, label, slug (nullable text), config (jsonb), position_x (real), and position_y (real). The type enum MUST include: `api_request`, `ai_sdk`, `sandbox`, `condition`, `transform`, `metric_capture`. Deleting a pipeline MUST cascade-delete all its nodes. Non-null slug values MUST be unique within a pipeline, enforced by a partial unique index (`WHERE slug IS NOT NULL`).

#### Scenario: Add a node to a pipeline
- **WHEN** a node of type `ai_sdk` is added with label `"Generator"`, slug `"generator"`, config `{ "model": "gpt-4o", "provider": "openai" }` and position (200, 100)
- **THEN** the system persists the node linked to its pipeline with the given type, label, slug, config, and position

#### Scenario: Delete pipeline cascades to nodes
- **WHEN** a pipeline with 5 nodes is deleted
- **THEN** all 5 nodes are deleted

#### Scenario: Slug uniqueness within a pipeline
- **WHEN** two nodes in the same pipeline are assigned slug `"generator"`
- **THEN** the database rejects the insert/update with a unique constraint violation

#### Scenario: Null slugs do not conflict
- **WHEN** three nodes in the same pipeline all have slug `null`
- **THEN** the database allows all three (partial unique index excludes nulls)

#### Scenario: Same slug in different pipelines
- **WHEN** pipeline A has a node with slug `"generator"` and pipeline B also has a node with slug `"generator"`
- **THEN** both are allowed (uniqueness is scoped to pipeline_id)

### Requirement: Pipeline edges
The system SHALL store pipeline edges with an id, pipeline_id (foreign key), source_node_id (foreign key to pipeline_nodes), source_handle (nullable text), target_node_id (foreign key to pipeline_nodes), target_handle (nullable text), and label (nullable text). Deleting a node MUST cascade-delete all edges connected to it.

#### Scenario: Connect two nodes
- **WHEN** an edge is created from node A (source_handle: null) to node B (target_handle: null)
- **THEN** the system persists the edge with both node references

#### Scenario: Conditional edge with handle
- **WHEN** an edge is created from a condition node (source_handle: "true") to node C
- **THEN** the system persists the edge with source_handle "true"

#### Scenario: Delete node cascades to edges
- **WHEN** a node that is the source of 3 edges is deleted
- **THEN** all 3 edges are deleted

### Requirement: Pipeline runs
The system SHALL store pipeline runs with an id, pipeline_id (foreign key), status enum (`pending`, `running`, `completed`, `failed`), trigger_payload (jsonb), graph_snapshot (jsonb), workflow_run_id (nullable text for Vercel Workflow tracking), started_at, and completed_at. The graph_snapshot MUST contain the full serialized graph (all nodes with type, label, config, positions, and all edges with source/target/handles) as it existed at the moment the run was triggered. A pipeline MUST support multiple concurrent runs.

#### Scenario: Create a run
- **WHEN** a pipeline run is triggered with payload `{ "prompt": "test" }`
- **THEN** a run row is created with status `pending`, the given trigger_payload, and a graph_snapshot containing the current pipeline graph

#### Scenario: Run lifecycle
- **WHEN** a run transitions from `pending` to `running` to `completed`
- **THEN** started_at is set when entering `running` and completed_at is set when entering `completed`

#### Scenario: Snapshot isolation from edits
- **WHEN** a pipeline is edited after a run has been triggered
- **THEN** the run's graph_snapshot remains unchanged and the run executes against the original graph

### Requirement: Step results
The system SHALL store step results with an id, run_id (foreign key to pipeline_runs), node_id (plain text referencing a node ID within the run's graph_snapshot, NOT a foreign key to pipeline_nodes), status enum (`pending`, `running`, `completed`, `failed`, `skipped`), input (jsonb), output (jsonb), error (nullable jsonb), duration_ms (nullable integer), started_at, and completed_at. There MUST be at most one step_result per (run_id, node_id) pair.

#### Scenario: Record step completion
- **WHEN** a node finishes execution with output `{ "score": 0.85 }` after 1200ms
- **THEN** a step_result row is created/updated with status `completed`, the output, duration_ms 1200, and completed_at timestamp

#### Scenario: Record step failure
- **WHEN** a node execution throws an error
- **THEN** the step_result is updated with status `failed`, the error details in the error column, and completed_at timestamp

#### Scenario: Skipped step on inactive branch
- **WHEN** a conditional branch is not taken and a downstream node is never executed
- **THEN** no step_result row is created for that node (it simply does not appear in results)

### Requirement: Graph validation
The system SHALL validate that a pipeline graph is a valid DAG before allowing saves. The graph MUST NOT contain cycles. Every node except entry nodes (type is not `condition` and has no special entry designation) MUST have at least one incoming edge. Condition nodes MUST have at least two outgoing edges with distinct source_handles.

#### Scenario: Reject cycle
- **WHEN** a user adds an edge that creates a cycle (A → B → C → A)
- **THEN** the system rejects the save with a validation error indicating the cycle

#### Scenario: Condition node with single output
- **WHEN** a condition node has only one outgoing edge
- **THEN** the system warns that the condition node needs at least two branches
