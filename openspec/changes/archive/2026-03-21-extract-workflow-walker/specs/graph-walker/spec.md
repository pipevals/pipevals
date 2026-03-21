## MODIFIED Requirements

### Requirement: Durable execution via Vercel Workflow

The system SHALL execute each node as a named `step.run()` call within a Vercel Workflow. The step name MUST be `node-${nodeId}` to ensure deterministic replay. If the workflow process crashes and restarts, completed steps MUST return their cached results and execution MUST resume from the first uncached step.

The walker function SHALL be produced by the `createWalker` factory from the `@pipevals/workflow-walker` package, not defined inline in the pipevals codebase. Pipevals SHALL provide a `PersistenceAdapter` implementation backed by its Drizzle schema and a `StepRegistry` populated from its existing step handlers.

For suspendable nodes (identified by the `HookAdapter.shouldSuspend()` predicate), the walker SHALL delegate to `HookAdapter.executeSuspendable()` at the workflow level instead of the normal `executeNode` path. Pipevals SHALL provide a `HookAdapter` that returns true for `human_review` nodes and implements the existing three-phase suspension logic (create tasks → create hooks → aggregate results).

All other node types MUST continue to execute via the step registry path.

#### Scenario: Normal execution

- **WHEN** a pipeline with 5 nodes (none are suspendable) runs to completion
- **THEN** 5 `step.run()` calls are made, each with a unique `node-${nodeId}` name

#### Scenario: Resume after crash

- **WHEN** a workflow crashes after completing nodes A and B but before completing C
- **THEN** on restart, `step.run("node-A")` and `step.run("node-B")` return cached results, and execution resumes with `step.run("node-C")`

#### Scenario: Human review node suspends workflow

- **WHEN** the walker reaches a `human_review` node at a given topological level
- **THEN** the hook adapter's `shouldSuspend` returns true, and `executeSuspendable` creates task records via a step, creates hooks at workflow level, and the workflow suspends until all hooks are resumed

#### Scenario: Mixed level with human review and regular nodes

- **WHEN** a topological level contains both a `human_review` node and a regular `ai_sdk` node
- **THEN** both execute in parallel via `Promise.allSettled` — the `ai_sdk` node runs through the step registry and the `human_review` node runs through the hook adapter

### Requirement: Step result recording

The system SHALL record step execution state via the `PersistenceAdapter` interface methods rather than direct database calls. The adapter's `recordStepRunning` SHALL be called when execution begins, `recordStepCompleted` with output and duration on success, and `recordStepFailed` with error and duration on failure.

Pipevals SHALL implement these adapter methods with its existing Drizzle queries against the `step_results` table, preserving identical database behavior.

#### Scenario: Record running status

- **WHEN** a node begins execution
- **THEN** the walker calls `persistence.recordStepRunning(runId, nodeId)` and pipevals' adapter inserts a step_result row with status `running`

#### Scenario: Record completion

- **WHEN** a node finishes successfully with output `{ "score": 0.9 }`
- **THEN** the walker calls `persistence.recordStepCompleted(runId, nodeId, input, output, durationMs)` and pipevals' adapter updates the row

#### Scenario: Record failure

- **WHEN** a node throws an error during execution
- **THEN** the walker calls `persistence.recordStepFailed(runId, nodeId, input, error, durationMs)` and pipevals' adapter updates the row with the serialized error

### Requirement: Run status management

The system SHALL update the run status via `PersistenceAdapter.updateRunStatus()` rather than direct database calls. The lifecycle transitions remain: `pending` → `running` → `completed` or `failed`.

Pipevals SHALL implement `updateRunStatus` with its existing Drizzle query against the `pipeline_runs` table.

#### Scenario: Successful run

- **WHEN** all nodes in the pipeline execute successfully
- **THEN** the walker calls `persistence.updateRunStatus(runId, "completed")`

#### Scenario: Failed run

- **WHEN** a node fails and there is no alternative path
- **THEN** the walker calls `persistence.updateRunStatus(runId, "failed")` and throws the error
