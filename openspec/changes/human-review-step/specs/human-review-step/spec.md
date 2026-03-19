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

The system SHALL provide a handler for the `human_review` step type that does NOT execute inside a `"use step"` boundary. Instead, it SHALL operate at the workflow level to support hook-based suspension. The handler MUST:

1. Resolve display data by evaluating all dot-path expressions in the `display` config against the step's input context
2. Create N task records (one per required reviewer) in the `tasks` table, each with a unique hook token
3. Update the step result status to `awaiting_review`
4. Update the run status to `awaiting_review`
5. Create N workflow hooks using `defineHook`/`.create()` and await all of them with `Promise.all`
6. When all hooks are resumed (all reviewers have submitted), aggregate the results
7. Update the step result to `completed` with the aggregated output
8. Update the run status back to `running`

The step output MUST be a JSON object with:
- `reviews`: an array of individual reviewer submissions, each containing `reviewerId`, `reviewerIndex`, `scores` (object mapping rubric field names to values), and any text field responses
- `scores`: an object mapping each numeric rubric field name to the mean value across all reviewers

#### Scenario: Single reviewer completes review

- **WHEN** a `human_review` step with `requiredReviewers: 1` is reached and the reviewer submits `{ accuracy: 4, notes: "Good" }`
- **THEN** the step resumes and outputs `{ reviews: [{ reviewerId: "user_1", reviewerIndex: 0, scores: { accuracy: 4 }, notes: "Good" }], scores: { accuracy: 4 } }`

#### Scenario: Multiple reviewers complete reviews

- **WHEN** a `human_review` step with `requiredReviewers: 3` is reached and three reviewers submit accuracy scores of 4, 5, and 3
- **THEN** the step resumes only after all three submit, and outputs `scores: { accuracy: 4 }` (mean of 4, 5, 3)

#### Scenario: Workflow suspends until reviews arrive

- **WHEN** a `human_review` step creates its hooks and no reviewer has submitted yet
- **THEN** the workflow remains suspended and no downstream nodes execute

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
