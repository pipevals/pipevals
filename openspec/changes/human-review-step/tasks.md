## 1. Database Schema & Types

- [x] 1.1 Add `"human_review"` to `stepTypeEnum` and `pipelineNodeTypeEnum` in `lib/db/pipeline-schema.ts`
- [x] 1.2 Add `"awaiting_review"` to `stepResultStatusEnum` and the run status enum in `lib/db/pipeline-schema.ts`
- [x] 1.3 Create the `tasks` table in `lib/db/pipeline-schema.ts` with all columns (id, pipelineId, runId, nodeId, hookToken, status, rubric, displayData, response, reviewerIndex, reviewedBy, createdAt, completedAt), foreign keys, and indexes
- [x] 1.4 Export tasks table relations in the Drizzle schema
- [x] 1.5 Generate and run the database migration
- [x] 1.6 Add `HumanReviewConfig` and `RubricField` types to `lib/pipeline/types.ts`, add `HumanReviewConfig` to the `NodeConfig` union, and add the default config entry

## 2. Step Registry & Ports

- [x] 2.1 Create `lib/pipeline/steps/human-review.ts` with a placeholder handler that throws if called directly
- [x] 2.2 Add `human_review` port declarations to `lib/pipeline/steps/ports.ts` (additive input on `display`, output key `scores`)
- [x] 2.3 Register `human_review` in `lib/pipeline/steps/registry.ts`

## 3. Walker — Workflow-Level HITL Execution

- [x] 3.1 Define the review hook with `defineHook` in the walker module (e.g., `lib/pipeline/walker/review-hook.ts`)
- [x] 3.2 Create `executeHumanReview` function in `lib/pipeline/walker/human-review.ts` — a plain async function (NOT `"use step"`) that orchestrates: resolving display data, creating task records (`"use step"`), updating step/run status to `awaiting_review` (`"use step"`), creating N hooks, awaiting `Promise.all(hooks)`, aggregating results, and recording completion (`"use step"`)
- [x] 3.3 Update `lib/pipeline/walker/workflow.ts` to detect `human_review` nodes and route them to `executeHumanReview` instead of `executeNode`
- [x] 3.4 Update `lib/pipeline/walker/step-recorder.ts` to support the `awaiting_review` status transition

## 4. Task APIs

- [x] 4.1 Create `GET /api/pipelines/[id]/tasks` route — list tasks for a pipeline with auth and org verification
- [x] 4.2 Create `GET /api/tasks/[id]` route — fetch full task detail (rubric, displayData, response) with auth
- [x] 4.3 Create `POST /api/tasks/[id]/submit` route — validate submission against rubric, update task, call `resumeHook`, return updated task
- [x] 4.4 Add rubric validation logic (rating range, boolean type, select options, all fields required)

## 5. Pipeline Builder UI

- [x] 5.1 Update the node palette to organize step types into categories (Execute, Flow, Measure, Review) with the `human_review` step in the Review category
- [x] 5.2 Create the `human_review` config panel section: display data key-value editor (label + dot-path)
- [x] 5.3 Create the rubric editor in the config panel: add/remove fields, type selector, type-specific options (min/max for rating, options for select, placeholder for text)
- [x] 5.4 Add the required reviewers number input to the config panel

## 6. Tasks Page — Layout & Queue

- [x] 6.1 Add "Tasks" link to the pipeline sub-navigation with pending task count badge
- [x] 6.2 Create the tasks page route at `/pipelines/[id]/tasks` with the sidebar + main panel layout
- [x] 6.3 Build the task queue sidebar component: task list items with run reference, node label, progress indicator (N/M reviewed), reviewer avatars, status filter (all/pending/completed)
- [x] 6.4 Wire up SWR data fetching for the task list from `GET /api/pipelines/[id]/tasks`

## 7. Tasks Page — Review Form

- [x] 7.1 Build the display data panel component: renders resolved display data with labels, handles side-by-side layout for 2 entries, JSON viewer for object values
- [x] 7.2 Build the scoring form component: renders rubric fields as interactive inputs (rating buttons, boolean toggle, text area, select dropdown)
- [x] 7.3 Add form validation (all fields required, rating within range) and submit handler calling `POST /api/tasks/[id]/submit`
- [x] 7.4 Build the submitted reviews display: read-only view of sibling task responses with reviewer names and timestamps
- [x] 7.5 Add submission success feedback and sidebar status update

## 8. Run Viewer Updates

- [ ] 8.1 Add `awaiting_review` badge styling (amber/orange) to the run viewer node status badges
- [ ] 8.2 Update polling logic to continue polling during `awaiting_review` status (at a slower 5s interval)
- [ ] 8.3 Update run summary to show "Waiting on: <step label>" with a link to the tasks page when run is `awaiting_review`
- [ ] 8.4 Add "Tasks" to the sub-navigation links in the run viewer

## 9. Testing

- [ ] 9.1 Unit tests for rubric validation logic (valid ratings, out-of-range, missing fields, invalid types)
- [ ] 9.2 Unit tests for score aggregation (single reviewer, multiple reviewers, mean calculation)
- [ ] 9.3 Unit tests for display data resolution from step inputs
- [ ] 9.4 Integration tests for task submission API (valid submit, duplicate submit, invalid scores)
