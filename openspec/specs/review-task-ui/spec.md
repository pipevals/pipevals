## ADDED Requirements

### Requirement: Tasks page navigation

The system SHALL add a "Tasks" link to the pipeline sub-navigation alongside Editor, Metrics, and Runs. The route MUST be `/pipelines/[id]/tasks`. The Tasks link MUST display a badge count of pending tasks when there are any.

#### Scenario: Navigate to tasks page

- **WHEN** a user clicks "Tasks" in the pipeline sub-navigation
- **THEN** the browser navigates to `/pipelines/[id]/tasks` and the Tasks link shows as active

#### Scenario: Pending task badge

- **WHEN** a pipeline has 3 pending review tasks
- **THEN** the Tasks sub-navigation link displays a badge with "3"

### Requirement: Task queue sidebar

The system SHALL render a left sidebar on the tasks page listing all tasks for the pipeline. Each task item MUST show:
- The run reference (truncated run ID)
- The node label of the `human_review` step
- A truncated preview of the first display data value
- The review progress: "N/M reviewed" where N is completed tasks and M is total tasks for that step/run combination
- Avatars or initials of users who have already submitted reviews for sibling tasks

The sidebar MUST indicate the currently selected task with a left border accent. Tasks MUST be filterable by status (all, pending, completed). Clicking a task MUST select it and display its details in the main panel.

#### Scenario: View task queue with mixed statuses

- **WHEN** a pipeline has 4 tasks: 2 pending and 2 completed
- **THEN** the sidebar shows all 4, with completed tasks showing reviewer avatars and pending tasks showing "0/N reviewed"

#### Scenario: Select a task

- **WHEN** a user clicks a pending task in the sidebar
- **THEN** the task is highlighted with a left border accent and its details appear in the main panel

#### Scenario: Filter to pending only

- **WHEN** a user selects the "Pending" filter
- **THEN** only pending tasks are shown in the sidebar

### Requirement: Display data panel

The system SHALL render the task's resolved display data in the main panel above the scoring form. Each entry in the `displayData` object MUST be shown with its label and value. String values MUST be rendered as formatted text. JSON object values MUST be rendered in a collapsible JSON viewer. If there are exactly two display entries, they SHOULD be rendered side-by-side in a comparison layout.

#### Scenario: Single display field

- **WHEN** a task has `displayData: { "AI Response": "The quarterly report shows..." }`
- **THEN** the panel shows a section labeled "AI Response" with the text content

#### Scenario: Two display fields side-by-side

- **WHEN** a task has `displayData: { "Baseline": "Response A...", "Candidate": "Response B..." }`
- **THEN** the panel renders two columns side-by-side with labels "Baseline" and "Candidate"

#### Scenario: JSON display value

- **WHEN** a task has `displayData: { "API Response": { "status": 200, "body": { ... } } }`
- **THEN** the panel shows a collapsible JSON viewer for the value

### Requirement: Scoring form

The system SHALL render an interactive scoring form based on the task's rubric definition. Each rubric field MUST be rendered as the appropriate input control:
- `rating`: A row of selectable score buttons from `min` to `max`, with the current selection highlighted. MUST display the field label and selected value.
- `boolean`: A toggle or radio group with "Yes" and "No" options
- `text`: A textarea input with optional placeholder
- `select`: A dropdown with the defined options

All rubric fields MUST be required. The form MUST NOT be submittable until all fields have values. The submit button MUST be labeled "Submit Review".

#### Scenario: Fill out rating field

- **WHEN** a reviewer clicks score "4" on the "Accuracy" rating field (min: 1, max: 5)
- **THEN** the "4" button is highlighted, the field shows "4/5", and a progress bar fills to 80%

#### Scenario: Submit complete review

- **WHEN** a reviewer has filled all rubric fields and clicks "Submit Review"
- **THEN** the form submits via POST to `/api/tasks/[id]/submit` with the field values

#### Scenario: Incomplete form prevents submission

- **WHEN** a reviewer has filled 2 of 3 rubric fields
- **THEN** the "Submit Review" button is disabled

### Requirement: Submitted reviews display

The system SHALL display previously submitted reviews below the scoring form for completed sibling tasks (tasks with the same runId and nodeId but different reviewerIndex). Each submitted review MUST show the reviewer's name or initials, their scores, and the submission timestamp. Submitted reviews MUST be read-only.

#### Scenario: View other reviewer's submission

- **WHEN** a task has 2 sibling tasks, one of which is completed by user "JD" with scores `{ accuracy: 5, tone: 4 }`
- **THEN** below the scoring form, a read-only section shows "JD" with their scores and timestamp

#### Scenario: All reviews complete

- **WHEN** all sibling tasks for a run/node are completed
- **THEN** the scoring form is replaced with a read-only view of all submitted reviews and the aggregated scores

### Requirement: Task completion feedback

The system SHALL show a success state after a review is submitted. The task's status in the sidebar MUST update to reflect the completion. If this was the last required review, the system MUST indicate that the pipeline run has resumed.

#### Scenario: Submit final review

- **WHEN** a reviewer submits the last required review for a human_review step (e.g., review 3 of 3)
- **THEN** a success message indicates "Pipeline run resumed" and the sidebar updates the task progress to "3/3 reviewed"

#### Scenario: Submit non-final review

- **WHEN** a reviewer submits review 1 of 3
- **THEN** a success message confirms the submission and the sidebar updates to "1/3 reviewed"
