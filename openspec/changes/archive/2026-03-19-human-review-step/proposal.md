## Why

Pipevals currently supports only automated evaluation steps — there is no way for a human to participate in the pipeline as a reviewer. Many evaluation workflows require human-in-the-loop (HITL) validation: subject matter experts scoring LLM outputs on subjective dimensions (tone, accuracy, policy compliance), comparing model responses side-by-side, or providing qualitative feedback that automated metrics cannot capture. Without this, teams must evaluate outside the platform and manually reconcile results.

## What Changes

- **New `human_review` step type**: A pipeline step that suspends execution, creates review tasks, and resumes when all required reviewers have submitted scores. Uses Vercel Workflow's `defineHook`/`resumeHook` for durable suspension.
- **New `tasks` database table**: Stores pending and completed review tasks with rubric definitions, resolved display data, and reviewer responses.
- **New tasks page (`/pipelines/[id]/tasks`)**: A review queue UI with a sidebar listing pending/completed tasks and a main panel showing upstream data + an interactive scoring form built from the rubric.
- **New task submission API (`POST /api/tasks/[id]/submit`)**: Validates the response against the rubric, records the review, and calls `resumeHook` to resume the suspended workflow.
- **New `awaiting_review` status**: Added to both `stepResultStatusEnum` and `runStatusEnum` so runs and steps correctly reflect when they are blocked on human input.
- **N-reviewer support**: A `human_review` step can require multiple reviewers. Each reviewer gets their own task. The step output aggregates all reviews with mean scores flowing downstream via the existing dot-path system.
- **Walker branching for HITL nodes**: The workflow walker gets a special execution path for `human_review` nodes that operates at the workflow level (not inside a `"use step"`) to support hook-based suspension.

## Capabilities

### New Capabilities
- `human-review-step`: The step type definition, config schema (display mapping, rubric fields, required reviewers), handler logic, port declarations, and registration in the step registry.
- `review-tasks`: The tasks database table, task creation during workflow execution, task submission API with rubric validation and `resumeHook` integration, and the tasks list/detail pages.
- `review-task-ui`: The review task page layout — sidebar task queue, display data panel showing resolved upstream outputs, interactive scoring form rendered from the rubric definition, and submitted review display.

### Modified Capabilities
- `graph-walker`: The walker must branch execution for `human_review` nodes — using workflow-level hook suspension instead of the standard `executeNode` step path.
- `step-registry`: Add `human_review` to the registry with its handler and port declarations.
- `pipeline-builder-ui`: Add a new "Review" category to the node palette containing the `human_review` step, and a config panel for editing display mappings, rubric fields, and reviewer count.
- `pipeline-run-viewer`: Support the new `awaiting_review` status with appropriate badge styling and polling behavior (continue polling while awaiting review).

## Impact

- **Database**: New `tasks` table, new enum values in `stepResultStatusEnum` and `runStatusEnum`, new value in `stepTypeEnum`/`pipelineNodeTypeEnum`. Requires a migration.
- **Workflow walker**: `workflow.ts` gains a conditional branch for `human_review` nodes with hook-based suspension logic outside the `executeNode` step boundary.
- **API routes**: New `/api/pipelines/[id]/tasks` (list) and `/api/tasks/[id]/submit` (submit review) endpoints.
- **UI components**: New task queue sidebar, review form, display data panel. New node palette category. Config panel additions for the `human_review` step.
- **Zustand stores**: Likely a new `useTaskStore` or similar for the tasks page state.
- **Types**: New `HumanReviewConfig`, `RubricField`, task-related types.
