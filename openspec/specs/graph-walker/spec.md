## ADDED Requirements

### Requirement: Graph loading from snapshot
The system SHALL load the pipeline graph from the run's `graph_snapshot` column (not from the live `pipeline_nodes`/`pipeline_edges` tables). The loaded graph MUST include each node's type, config, and all edges with their source/target handles. This ensures the walker always executes the graph as it existed when the run was triggered, regardless of subsequent edits to the pipeline.

#### Scenario: Load graph from run snapshot
- **WHEN** a pipeline run is triggered for pipeline "abc-123"
- **THEN** the walker reads the graph from the run's graph_snapshot, not from pipeline_nodes/edges

#### Scenario: Walker unaffected by concurrent edits
- **WHEN** a user edits the pipeline while a run is in progress
- **THEN** the walker continues executing the original graph from the snapshot

### Requirement: Topological execution order
The system SHALL compute a topological ordering of the pipeline graph and execute nodes level-by-level. Nodes with no unresolved upstream dependencies at the same level MUST be eligible for parallel execution. A node MUST NOT execute until all its active incoming edges' source nodes have completed.

#### Scenario: Linear pipeline
- **WHEN** a pipeline has nodes A → B → C
- **THEN** the walker executes A, then B, then C in sequence

#### Scenario: Fan-out parallelism
- **WHEN** node A has edges to B, C, and D with no dependencies between B, C, D
- **THEN** the walker executes A, then B, C, and D in parallel

#### Scenario: Fan-in waits for all upstream
- **WHEN** node D depends on B and C, and B finishes before C
- **THEN** D does not execute until both B and C have completed

### Requirement: Input resolution via dot-path
The system SHALL resolve each node's inputs before execution by evaluating dot-path expressions against the accumulated results of upstream nodes. The resolution context MUST include `steps.<nodeId>.<path>` for each completed upstream node's output and `trigger.<path>` for the original trigger payload. Unresolvable paths MUST cause the step to fail with a clear error message.

#### Scenario: Resolve single upstream reference
- **WHEN** a node's config references `steps.nodeA.response.text` and nodeA's output is `{ "response": { "text": "hello" } }`
- **THEN** the expression resolves to `"hello"`

#### Scenario: Resolve trigger payload
- **WHEN** a node's config references `trigger.prompt` and the run was triggered with `{ "prompt": "test" }`
- **THEN** the expression resolves to `"test"`

#### Scenario: Unresolvable path
- **WHEN** a node's config references `steps.nodeA.nonexistent.field` and nodeA's output lacks that path
- **THEN** the step fails with an error indicating the unresolvable path

### Requirement: Conditional branching
The system SHALL support conditional branching by evaluating condition nodes and only activating edges whose source_handle matches the condition's selected branch. Nodes downstream of inactive branches MUST NOT execute. A node with multiple incoming edges from different branches MUST only require the active incoming edges to be satisfied.

#### Scenario: True branch taken
- **WHEN** a condition node evaluates to branch "true" and has edges "true" → X and "false" → Y
- **THEN** node X executes and node Y does not execute

#### Scenario: Convergence after condition
- **WHEN** both branches of a condition eventually merge at node Z, and only the "true" branch is active
- **THEN** node Z executes once the "true" branch path to Z is complete, without waiting for the inactive "false" path

### Requirement: Durable execution via Vercel Workflow

The system SHALL execute each node as a named `step.run()` call within a Vercel Workflow. The step name MUST be `node-${nodeId}` to ensure deterministic replay. If the workflow process crashes and restarts, completed steps MUST return their cached results and execution MUST resume from the first uncached step.

For `human_review` nodes, the system SHALL NOT execute the node inside a `"use step"` boundary. Instead, the walker MUST detect `human_review` nodes and route them to a dedicated workflow-level execution path that:
1. Calls `"use step"` functions for database operations (creating tasks, recording status)
2. Creates workflow hooks at the workflow level using `defineHook`/`.create()`
3. Awaits all hooks with `Promise.all` at the workflow level (causing workflow suspension)
4. Calls `"use step"` functions for recording completion after all hooks resolve

All other node types MUST continue to execute via the existing `executeNode` `"use step"` path unchanged.

#### Scenario: Normal execution

- **WHEN** a pipeline with 5 nodes (none are human_review) runs to completion
- **THEN** 5 `step.run()` calls are made, each with a unique `node-${nodeId}` name

#### Scenario: Resume after crash

- **WHEN** a workflow crashes after completing nodes A and B but before completing C
- **THEN** on restart, `step.run("node-A")` and `step.run("node-B")` return cached results, and execution resumes with `step.run("node-C")`

#### Scenario: Human review node suspends workflow

- **WHEN** the walker reaches a `human_review` node at a given topological level
- **THEN** the walker creates task records via a step, creates hooks at workflow level, and the workflow suspends until all hooks are resumed

#### Scenario: Mixed level with human review and regular nodes

- **WHEN** a topological level contains both a `human_review` node and a regular `ai_sdk` node
- **THEN** both execute in parallel via `Promise.allSettled` — the `ai_sdk` node runs through `executeNode` and the `human_review` node runs through the dedicated workflow-level path

### Requirement: Step result recording
The system SHALL write a `step_results` row to the database for each node as execution progresses. The status MUST transition: `running` when execution begins → `completed` with output on success → `failed` with error details on failure. The duration_ms MUST be recorded for completed and failed steps.

#### Scenario: Record running status
- **WHEN** a node begins execution
- **THEN** a step_result row is inserted with status `running` and started_at timestamp

#### Scenario: Record completion
- **WHEN** a node finishes successfully with output `{ "score": 0.9 }`
- **THEN** the step_result row is updated to status `completed` with the output, duration_ms, and completed_at

#### Scenario: Record failure
- **WHEN** a node throws an error during execution
- **THEN** the step_result row is updated to status `failed` with the error serialized in the error column

### Requirement: Run status management
The system SHALL update the pipeline_run status throughout execution. The status MUST transition: `pending` → `running` when the walker begins → `completed` when all terminal nodes complete → `failed` if any non-skipped node fails without a fallback path.

#### Scenario: Successful run
- **WHEN** all nodes in the pipeline execute successfully
- **THEN** the run status transitions to `completed` with completed_at set

#### Scenario: Failed run
- **WHEN** a node fails and there is no alternative path to complete the pipeline
- **THEN** the run status transitions to `failed` with completed_at set

### Requirement: Graph size limit
The system SHALL enforce a maximum of 50 nodes per pipeline to stay within Vercel Workflow step limits. Pipelines exceeding this limit MUST be rejected at save time with a clear error.

#### Scenario: Pipeline within limit
- **WHEN** a user saves a pipeline with 30 nodes
- **THEN** the save succeeds

#### Scenario: Pipeline exceeds limit
- **WHEN** a user attempts to save a pipeline with 55 nodes
- **THEN** the save is rejected with an error indicating the 50-node limit
