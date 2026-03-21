## MODIFIED Requirements

### Requirement: Human review step handler

The system SHALL implement the `human_review` suspension logic via a `HookAdapter` provided to `createWalker()`, rather than hardcoding it in the walker's orchestration loop.

Pipevals' `HookAdapter` implementation SHALL:
1. Return `true` from `shouldSuspend()` for nodes with `type === "human_review"`
2. Implement `executeSuspendable()` with the existing three-phase logic:
   - Phase 1 (`"use step"`): Resolve display data, create task records in the `tasks` table, record step as `awaiting_review`, update run status to `awaiting_review`
   - Phase 2 (workflow level): Create N hooks via `defineHook().create()`, await all with `Promise.all` (workflow suspends)
   - Phase 3 (`"use step"`): Aggregate reviewer scores, record step as `completed`, update run status to `running`

The step output SHALL remain identical: `{ reviews: [...], scores: { ... } }` with mean aggregation for rating fields.

#### Scenario: Single reviewer completes review

- **WHEN** a `human_review` step with `requiredReviewers: 1` is reached and the reviewer submits `{ accuracy: 4, notes: "Good" }`
- **THEN** the hook adapter's `executeSuspendable` returns `{ reviews: [{ reviewerId: "user_1", reviewerIndex: 0, scores: { accuracy: 4 } }], scores: { accuracy: 4 } }`

#### Scenario: Multiple reviewers complete reviews

- **WHEN** a `human_review` step with `requiredReviewers: 3` is reached and three reviewers submit accuracy scores of 4, 5, and 3
- **THEN** `executeSuspendable` returns only after all three submit, with `scores: { accuracy: 4 }` (mean)

#### Scenario: Workflow suspends until reviews arrive

- **WHEN** a `human_review` step creates its hooks and no reviewer has submitted yet
- **THEN** the workflow remains suspended inside `executeSuspendable` and no downstream nodes execute

### Requirement: Human review hook adapter is pipevals-specific

The `HookAdapter` implementation for human review SHALL remain in the pipevals codebase, not in the extracted walker package. It depends on pipevals' `tasks` table, `pipelineRuns` table, `reviewHook` definition, and `aggregateReviews` logic — all of which are pipevals-specific.

The walker package SHALL only define the `HookAdapter` interface. The implementation is the consumer's responsibility.

#### Scenario: Another project implements a different suspendable step

- **WHEN** another project needs an `approval_gate` step that suspends until a manager approves
- **THEN** they implement `HookAdapter` with `shouldSuspend` returning true for `approval_gate` nodes, and `executeSuspendable` creating a single hook that resumes on manager action — no changes to the walker package

#### Scenario: Pipevals upgrades walker package

- **WHEN** pipevals upgrades to a new version of the walker package
- **THEN** the `HookAdapter` implementation in pipevals continues to work as long as the `HookAdapter` interface is unchanged
