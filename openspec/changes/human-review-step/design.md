## Context

Pipevals pipelines currently execute as fully automated DAGs — every step is a pure async function (`config + input → output`) that runs inside a `"use step"` boundary in a Vercel Workflow. The walker iterates topological levels, running all nodes at each level in parallel via `Promise.allSettled`, then moves to the next level.

Adding human-in-the-loop review introduces a fundamentally different execution model: a step that **suspends** for an unbounded duration (hours or days) while waiting for human input. The Vercel Workflow runtime supports this via `defineHook`/`resumeHook` — durable hooks that suspend the workflow and resume it when an external event arrives.

The existing codebase has a clean step registry pattern, a dot-path template system, and additive/scalar port declarations. The design must integrate with all of these without disrupting the existing step types.

## Goals / Non-Goals

**Goals:**
- Add a `human_review` step type that suspends pipeline execution until all required reviewers submit scores
- Introduce a tasks table and tasks page where reviewers can claim and complete review tasks
- Output aggregated scores that flow downstream through the existing dot-path system
- Support N required reviewers per step with individual task records
- Use the Vercel Workflow hook primitive for durable suspension/resumption

**Non-Goals:**
- Notifications (email, Slack, webhooks) when tasks are created — deferred to future work
- Timeout/auto-fail for unreviewed tasks — deferred
- Real-time presence tracking (who is currently viewing a task) — deferred; only show who has submitted
- json-render integration for custom review form layouts — deferred; static rubric rendering first
- Reviewer assignment or access control beyond org membership — any org member can review
- Locking or exclusive claiming of tasks — multiple reviewers can work concurrently

## Decisions

### D1: Hook-based suspension at the workflow level, not inside `executeNode`

**Decision**: The `human_review` step gets a dedicated execution path in the walker that operates at the workflow level, bypassing the standard `executeNode("use step")` boundary.

**Rationale**: Workflow hooks (`defineHook`, `.create()`, `await hook`) are workflow-level orchestration primitives — they cannot be awaited inside a `"use step"` function. A step is a single retryable unit; a hook suspension is an orchestration-level pause. The existing `executeNode` function is marked `"use step"` and calls the handler synchronously. We cannot nest a hook await inside it.

**Alternative considered**: Restructuring `executeNode` to not be a step, and having each handler manage its own step boundary. Rejected because it would be a large refactor affecting all 6 existing step types for the sake of one new type.

**Implementation**: In `workflow.ts`, the `readyNodes.map(...)` block checks `node.type === "human_review"` and routes to `executeHumanReview()` — a plain async function (not a step) that orchestrates multiple step calls and hook awaits at the workflow level.

### D2: One task row per reviewer slot

**Decision**: For a `human_review` step with `requiredReviewers: N`, we create N task rows in the database, each with its own unique `hookToken` and `reviewerIndex` (0..N-1). Each reviewer picks an unclaimed task and submits against it.

**Rationale**: This is simpler than a single task with partial submissions. Each task is an independent unit with its own lifecycle (pending → completed). The workflow creates N hooks and awaits all of them with `Promise.all`. Each task submission calls `resumeHook` for its specific hook token.

**Alternative considered**: Single task row with a JSONB array of responses, incrementally updated. Rejected because it introduces concurrency concerns (two reviewers submitting simultaneously) and makes the hook resumption logic more complex (need to check "is this the last one?").

### D3: Rubric as a structured field array, not json-render spec

**Decision**: The rubric config is a typed array of `RubricField` objects (`rating | boolean | text | select`), not a json-render JSON spec. The review form renders these fields with standard React/shadcn components.

**Rationale**: A structured rubric is simpler to configure in the pipeline builder, validate on submission, and aggregate scores from. json-render can be introduced later as an optional rendering layer or for preview in the builder, but the source of truth for the scoring schema should remain the structured `rubric` array.

### D4: Aggregated mean scores as primary output

**Decision**: The `human_review` step output includes both individual reviews and an aggregated `scores` object where numeric fields (rating) are averaged across reviewers. The `scores` object is the primary downstream reference target.

**Rationale**: Downstream `metric_capture` steps typically want a single value per metric, not an array. Averaging is the simplest aggregation and works for most scoring rubrics. Individual reviews remain accessible at `steps.<label>.reviews[i]` for cases where per-reviewer data is needed.

### D5: Display data resolved and snapshot'd at task creation time

**Decision**: When the workflow creates review tasks, it resolves the `display` config's dot-paths against the current step inputs and stores the resolved values in the task's `displayData` column. The review form reads from this snapshot, not from the run's step results.

**Rationale**: The display data must be available even if the reviewer opens the task hours later and the run context is not readily accessible. Snapshotting ensures consistency — the reviewer always sees exactly what was available when the step executed, regardless of any subsequent pipeline changes.

### D6: New `awaiting_review` status for steps and runs

**Decision**: Add `"awaiting_review"` to both `stepResultStatusEnum` and `runStatusEnum`. The run status transitions: `running → awaiting_review` when a human_review step suspends, and `awaiting_review → running` when the last reviewer submits and the workflow resumes.

**Rationale**: Existing statuses (`pending`, `running`, `completed`, `failed`, `cancelled`) don't capture the "waiting on external input" state. A distinct status lets the UI show appropriate messaging and the run viewer polling logic knows to keep polling (but at a slower interval since human review can take hours).

### D7: Task submission endpoint calls `resumeHook` from `workflow/api`

**Decision**: The `POST /api/tasks/[id]/submit` route validates the response against the rubric, updates the task row, and calls `resumeHook(token, payload)` to wake the suspended workflow. This is a regular Next.js API route, not a workflow step.

**Rationale**: `resumeHook` is imported from `"workflow/api"` and is meant to be called from external API routes — that's the standard Workflow pattern for external event delivery.

## Risks / Trade-offs

**[Risk: Workflow suspension duration]** Vercel Workflow hooks can suspend for long periods, but there may be platform limits on suspension duration.
→ Mitigation: Document any known limits. For V1, no timeout is implemented — tasks remain pending indefinitely. Timeout support can be added later with `Promise.race([hook, sleep("72h")])`.

**[Risk: Orphaned tasks if pipeline/run is deleted]** If a user deletes a pipeline or cancels a run while tasks are pending, the workflow is stuck and tasks are orphaned.
→ Mitigation: Task table has `ON DELETE CASCADE` from `pipelineRuns`. Run cancellation should also clean up pending tasks and cancel the workflow.

**[Risk: N-reviewer scaling]** Creating N hooks and N task rows per human_review node could be expensive for large N.
→ Mitigation: For V1, this is acceptable. We can add a reasonable limit (e.g., max 10 reviewers) in validation.

**[Trade-off: No reviewer assignment]** Any org member can claim any task. This is simple but means no workload distribution.
→ Accepted for V1. Reviewer assignment and rotation can be added later.

**[Trade-off: Mean aggregation only]** Only mean is computed for numeric scores. Some use cases may want median, min, max, or weighted averages.
→ Accepted for V1. The individual reviews are preserved in the output, so custom aggregation can be done in a downstream sandbox step if needed.
