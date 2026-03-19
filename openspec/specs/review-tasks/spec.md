## ADDED Requirements

### Requirement: Tasks database table

The system SHALL create a `tasks` table with the following columns:
- `id`: UUID primary key
- `pipelineId`: foreign key to `pipelines` table (CASCADE on delete)
- `runId`: foreign key to `pipelineRuns` table (CASCADE on delete)
- `nodeId`: text, the ID of the `human_review` node in the graph
- `hookToken`: text, unique, the token for `resumeHook`
- `status`: text enum (`pending`, `completed`), default `pending`
- `rubric`: JSONB storing the rubric field definitions (copied from step config at task creation)
- `displayData`: JSONB storing the resolved upstream data snapshot
- `response`: JSONB storing the reviewer's submitted scores and text (nullable, populated on completion)
- `reviewerIndex`: integer (0-based index for N-reviewer support)
- `reviewedBy`: text, foreign key to `users` table (nullable, set on completion)
- `createdAt`: timestamp with default now
- `completedAt`: timestamp (nullable, set on completion)

The table MUST have indexes on `runId` and `pipelineId`. The `hookToken` column MUST have a unique index.

#### Scenario: Task created during workflow execution

- **WHEN** a `human_review` step with `requiredReviewers: 2` begins execution
- **THEN** 2 task rows are inserted with `status: pending`, `reviewerIndex: 0` and `reviewerIndex: 1`, each with a unique `hookToken`, and the resolved `displayData` and `rubric` from the step config

#### Scenario: Cascade delete on run deletion

- **WHEN** a pipeline run is deleted
- **THEN** all associated task rows are also deleted

### Requirement: Task list API

The system SHALL provide a `GET /api/pipelines/[id]/tasks` endpoint that returns all tasks for the given pipeline, ordered by creation date descending. The response MUST include task id, runId, nodeId, status, reviewerIndex, reviewedBy (with user name if available), createdAt, and completedAt. The endpoint MUST require authentication and verify the user belongs to the pipeline's organization.

#### Scenario: List pending tasks

- **WHEN** a user requests tasks for a pipeline that has 3 pending and 2 completed tasks
- **THEN** the API returns all 5 tasks with their status, ordered by creation date descending

#### Scenario: Unauthorized access

- **WHEN** a user not belonging to the pipeline's organization requests tasks
- **THEN** the API returns 403 Forbidden

### Requirement: Task detail API

The system SHALL provide a `GET /api/tasks/[id]` endpoint that returns the full task record including `rubric`, `displayData`, `response`, and reviewer information. The endpoint MUST require authentication and verify the user belongs to the task's pipeline's organization.

#### Scenario: Fetch task detail

- **WHEN** a user requests a pending task
- **THEN** the API returns the full task record with rubric definition and resolved display data

### Requirement: Task submission API

The system SHALL provide a `POST /api/tasks/[id]/submit` endpoint that accepts a review submission. The endpoint MUST:

1. Verify the task exists and has status `pending`
2. Validate the submission against the task's rubric schema:
   - Rating fields MUST have a numeric value between `min` and `max`
   - Boolean fields MUST have a boolean value
   - Text fields MUST have a string value
   - Select fields MUST have a value from the defined `options`
   - All rubric fields MUST be present in the submission
3. Update the task row: set `status` to `completed`, `response` to the submission, `reviewedBy` to the authenticated user's ID, and `completedAt` to now
4. Call `resumeHook(task.hookToken, payload)` to resume the suspended workflow with the reviewer's data
5. Return 200 with the updated task

#### Scenario: Valid submission

- **WHEN** a user submits `{ scores: { accuracy: 4, tone: 3 }, notes: "Solid response" }` for a pending task with rubric fields `accuracy` (rating 1-5), `tone` (rating 1-5), and `notes` (text)
- **THEN** the task is marked completed, the workflow hook is resumed, and the API returns 200

#### Scenario: Submission for completed task

- **WHEN** a user attempts to submit a review for a task with status `completed`
- **THEN** the API returns 409 Conflict with message "Task already completed"

#### Scenario: Invalid score value

- **WHEN** a user submits a rating of 6 for a rubric field with `max: 5`
- **THEN** the API returns 400 Bad Request with a validation error

#### Scenario: Missing rubric field

- **WHEN** a user submits a review missing the required `accuracy` field
- **THEN** the API returns 400 Bad Request indicating the missing field

### Requirement: Awaiting review status

The system SHALL add `"awaiting_review"` to both the `stepResultStatusEnum` and the run status enum. The step result status MUST transition to `awaiting_review` when the `human_review` step has created tasks and is waiting for reviewers. The run status MUST transition to `awaiting_review` when any step in the run is awaiting review. The run status MUST transition back to `running` when the last reviewer submits and the workflow resumes.

#### Scenario: Step enters awaiting review

- **WHEN** a `human_review` step creates its tasks and hooks
- **THEN** the step result status is `awaiting_review`

#### Scenario: Run enters awaiting review

- **WHEN** a step in the run transitions to `awaiting_review`
- **THEN** the run status transitions from `running` to `awaiting_review`

#### Scenario: Run resumes after all reviews

- **WHEN** the last required reviewer submits their review for a `human_review` step
- **THEN** the run status transitions from `awaiting_review` back to `running` and execution continues with downstream nodes
