## ADDED Requirements

### Requirement: Human review step config schema

The system SHALL define a `HumanReviewConfig` type with the following fields:
- `type`: literal `"human_review"`
- `display`: a `Record<string, string>` mapping display labels to dot-path expressions referencing upstream step outputs or trigger values
- `rubric`: an array of `RubricField` objects defining the scoring form
- `requiredReviewers`: a positive integer (default 1) specifying how many reviewers must submit before the step completes

`RubricField` SHALL be a discriminated union with four variants:
- `{ name: string; type: "rating"; min: number; max: number; label?: string }` — numeric rating scale
- `{ name: string; type: "boolean"; label: string }` — yes/no toggle
- `{ name: string; type: "text"; label?: string; placeholder?: string }` — freeform text
- `{ name: string; type: "select"; label?: string; options: string[] }` — dropdown selection

Each rubric field's `name` MUST be unique within the rubric array.

#### Scenario: Valid human review config

- **WHEN** a `human_review` node is configured with `display: { "AI Response": "steps.llm.text" }`, `rubric: [{ name: "accuracy", type: "rating", min: 1, max: 5 }]`, and `requiredReviewers: 2`
- **THEN** the config is accepted as valid

#### Scenario: Default required reviewers

- **WHEN** a `human_review` node is created with no `requiredReviewers` specified
- **THEN** the default value is 1

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

### Requirement: Human review step port declarations

The system SHALL register the `human_review` step type in the port registry with:
- Input ports: one `additive` port on the `display` config field (allowing upstream connections to populate display mappings)
- Output ports: one output port with key `scores` (referencing the aggregated scores object)

#### Scenario: Auto-wire upstream to display

- **WHEN** a user draws an edge from an `ai_sdk` node labeled "llm" to a `human_review` node
- **THEN** the auto-wire system adds an entry to the `display` config: `{ "": "steps.llm.text" }`

#### Scenario: Downstream references aggregated scores

- **WHEN** a `metric_capture` node is downstream of a `human_review` node labeled "review"
- **THEN** the dot-path `steps.review.scores` resolves to the aggregated scores object

### Requirement: Human review default config

The system SHALL define a default config for the `human_review` step type: `{ type: "human_review", display: {}, rubric: [], requiredReviewers: 1 }`.

#### Scenario: New human review node gets default config

- **WHEN** a user drags a `human_review` node from the palette onto the canvas
- **THEN** the node is created with an empty display mapping, empty rubric, and requiredReviewers set to 1
