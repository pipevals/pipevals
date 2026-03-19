## MODIFIED Requirements

### Requirement: Node status badges

The system SHALL display a status badge on each node reflecting its execution state in the current run. Statuses MUST include: pending (not yet reached), running (currently executing), completed (success), failed (error), skipped (on inactive conditional branch), and awaiting_review (waiting for human reviewers). The badge MUST update as new step_results are fetched.

The `awaiting_review` badge MUST use a distinct visual treatment (amber/orange color) to differentiate it from running (blue) and other statuses.

#### Scenario: Node completes

- **WHEN** a step_result for a node transitions to `completed`
- **THEN** the node's badge updates to show a completed indicator

#### Scenario: Node fails

- **WHEN** a step_result for a node transitions to `failed`
- **THEN** the node's badge updates to show a failed indicator with error styling

#### Scenario: Node on inactive branch

- **WHEN** a conditional branch is not taken
- **THEN** nodes on that branch display no badge or a dimmed/skipped indicator

#### Scenario: Node awaiting review

- **WHEN** a step_result for a `human_review` node transitions to `awaiting_review`
- **THEN** the node's badge shows an amber/orange indicator with "Awaiting review" text

### Requirement: Live progress polling

The system SHALL poll the run status API at a regular interval while the run status is `pending`, `running`, or `awaiting_review`. The polling interval MUST be configurable (default: 2 seconds for running, 5 seconds for awaiting_review). Polling MUST stop when the run reaches a terminal status (`completed` or `failed`).

#### Scenario: Live update during run

- **WHEN** a run is in progress and a step completes between polls
- **THEN** the next poll fetches updated step_results and the canvas reflects the new status

#### Scenario: Stop polling on completion

- **WHEN** the run transitions to `completed`
- **THEN** polling stops and the final state is displayed

#### Scenario: Slower polling during awaiting review

- **WHEN** the run status is `awaiting_review`
- **THEN** the polling interval increases to 5 seconds since human reviews may take hours

### Requirement: Run summary

The system SHALL display a summary panel for the run showing overall status, total duration, number of steps completed/failed/skipped/awaiting_review, and captured metrics. Metrics MUST be extracted from metric_capture step results. The run viewer page MUST include a sub-navigation component shared across all pipeline views (Editor, Metrics, Runs, Tasks) to allow users to switch between pipeline pages.

When a run is in `awaiting_review` status, the summary MUST indicate which `human_review` step is blocking and show a link to the tasks page for that pipeline.

#### Scenario: View run summary

- **WHEN** a user views a completed run that captured metrics "accuracy" (0.85) and "latency" (1200ms)
- **THEN** the summary panel shows status: completed, total duration, 7/7 steps completed, and the two metrics with their values

#### Scenario: Sub-navigation visible on run viewer

- **WHEN** a user is on a pipeline run viewer page
- **THEN** a sub-navigation with links to Editor, Metrics, Runs, and Tasks is visible, with Runs shown as the active section

#### Scenario: Run awaiting review summary

- **WHEN** a user views a run in `awaiting_review` status with the "quality_check" human_review step pending
- **THEN** the summary shows status: awaiting review, indicates "Waiting on: quality_check", and provides a link to the pipeline's tasks page
