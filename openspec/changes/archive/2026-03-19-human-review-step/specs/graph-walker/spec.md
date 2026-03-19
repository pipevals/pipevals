## MODIFIED Requirements

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
