## ADDED Requirements

### Requirement: PersistenceAdapter interface

The package SHALL define a `PersistenceAdapter` interface with the following methods:

- `loadRunData(runId: string): Promise<{ graphSnapshot: GraphSnapshot; triggerPayload: Record<string, unknown> }>` — loads the immutable graph snapshot and trigger payload for a run
- `updateRunStatus(runId: string, status: "running" | "completed" | "failed"): Promise<void>` — updates the run's lifecycle status
- `recordStepRunning(runId: string, nodeId: string): Promise<void>` — records that a step has begun execution
- `recordStepCompleted(runId: string, nodeId: string, input: unknown, output: unknown, durationMs: number): Promise<void>` — records a step's successful completion with its input snapshot, output, and duration
- `recordStepFailed(runId: string, nodeId: string, input: unknown, error: unknown, durationMs: number): Promise<void>` — records a step's failure with its input snapshot, serialized error, and duration

All methods SHALL be called within `"use step"` boundaries by the walker, ensuring they are deterministic and replayable.

#### Scenario: Walker calls persistence methods in order

- **WHEN** a node executes successfully
- **THEN** the walker calls `recordStepRunning`, then executes the handler, then calls `recordStepCompleted` with the duration

#### Scenario: Walker calls persistence on failure

- **WHEN** a node's handler throws an error
- **THEN** the walker calls `recordStepRunning`, then catches the error, then calls `recordStepFailed` with the serialized error and duration

#### Scenario: Consumer implements with Drizzle

- **WHEN** a consumer provides a `PersistenceAdapter` backed by Drizzle ORM
- **THEN** the walker calls adapter methods and the consumer's Drizzle queries execute within the Vercel Workflow step boundaries

### Requirement: StepRegistry type

The package SHALL define a `StepRegistry` type as `Record<string, { handler: StepHandler }>` where `StepHandler` is `(config: Record<string, unknown>, input: StepInput) => Promise<StepOutput>`.

The walker SHALL look up the handler for each node by its `type` field as a string key in the registry. If a node's type is not found in the registry and no hook adapter claims it, the walker SHALL throw an error.

#### Scenario: Registry lookup for known type

- **WHEN** a node has `type: "condition"` and the registry contains a `condition` entry
- **THEN** the walker invokes `registry["condition"].handler(config, input)`

#### Scenario: Registry lookup for unknown type

- **WHEN** a node has `type: "custom_step"` and the registry has no `custom_step` entry and no hook adapter claims it
- **THEN** the walker throws an error: `Unknown step type "custom_step"`

### Requirement: HookAdapter interface

The package SHALL define an optional `HookAdapter` interface with:

- `shouldSuspend(node: WalkerNode): boolean` — returns true if the node requires workflow-level suspension instead of normal step execution
- `executeSuspendable(runId: string, node: WalkerNode, input: StepInput): Promise<Record<string, unknown>>` — executes the node at the workflow level, which MAY create hooks, suspend the workflow, and resume when external events occur

The `executeSuspendable` method SHALL be called at the **workflow level**, NOT inside a `"use step"` boundary, so it can use `defineHook` and await hook resolution.

The walker SHALL check `hooks.shouldSuspend(node)` before looking up the step registry. If `shouldSuspend` returns true, the walker SHALL call `hooks.executeSuspendable()` instead of `executeNode()`.

#### Scenario: Human review node routes to hook adapter

- **WHEN** a node has `type: "human_review"` and the hook adapter's `shouldSuspend` returns true for it
- **THEN** the walker calls `hooks.executeSuspendable()` which can create workflow hooks and suspend

#### Scenario: Custom approval gate

- **WHEN** a consumer defines a custom `approval_gate` step type where `shouldSuspend` returns true
- **THEN** the walker suspends and the consumer's `executeSuspendable` creates a hook awaiting manager approval

#### Scenario: No hook adapter provided

- **WHEN** `createWalker` is called without a `hooks` property
- **THEN** the walker never calls `shouldSuspend` and routes all nodes through the step registry

### Requirement: GraphSnapshot type

The package SHALL export a `GraphSnapshot` type representing the serialized graph structure:

```typescript
interface GraphSnapshot {
  nodes: Array<{ id: string; type: string; label?: string; slug?: string; config: Record<string, unknown> }>;
  edges: Array<{ id: string; sourceNodeId: string; sourceHandle?: string; targetNodeId: string; targetHandle?: string }>;
}
```

This type SHALL be the contract between the consumer's persistence layer and the walker's graph loader. The consumer's `loadRunData` SHALL return data conforming to this shape.

#### Scenario: Consumer stores graph as JSON

- **WHEN** a consumer stores the graph snapshot as a JSONB column in Postgres
- **THEN** the column's parsed value conforms to `GraphSnapshot` and the walker loads it without transformation

#### Scenario: Consumer builds graph at runtime

- **WHEN** a consumer constructs a `GraphSnapshot` programmatically (e.g., from a YAML pipeline definition)
- **THEN** the walker accepts it identically to a database-loaded snapshot
