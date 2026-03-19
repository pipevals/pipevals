## ADDED Requirements

### Requirement: Run against dataset action
The pipeline detail page MUST include a "Run Dataset" button (alongside the existing single-run trigger). Clicking it MUST open a dialog that shows a list of compatible datasets (those whose schema keys match the pipeline's triggerSchema keys). The user MUST select a dataset and confirm to trigger an eval run via `POST /api/pipelines/:id/eval-runs`.

#### Scenario: Open dataset picker
- **WHEN** the user clicks "Run Dataset" on a pipeline with triggerSchema `{ prompt: "", expected: "" }`
- **THEN** a dialog opens showing only datasets whose schema has keys `["prompt", "expected"]`

#### Scenario: No compatible datasets
- **WHEN** no datasets in the organization have a matching schema
- **THEN** the dialog shows an empty state with a link to create a new dataset

#### Scenario: Trigger eval run
- **WHEN** the user selects "Golden Set" (10 items) and clicks "Run"
- **THEN** the system triggers an eval run and navigates to the eval run detail page

### Requirement: Eval runs list on pipeline page
The pipeline detail page MUST show an "Eval Runs" section (tab or list) alongside existing runs. Each eval run row MUST display: the dataset name, status, progress (completedItems/totalItems), and creation date.

#### Scenario: View eval runs
- **WHEN** a user views a pipeline that has 2 eval runs
- **THEN** the eval runs section shows 2 rows with dataset name, status, progress, and date

#### Scenario: No eval runs
- **WHEN** a pipeline has no eval runs
- **THEN** the section shows an empty state

### Requirement: Eval run detail page
The system SHALL render an eval run detail page at `/pipelines/[id]/eval-runs/[evalRunId]`. The page MUST show: the eval run status, dataset name, progress bar (completedItems/totalItems), aggregate metrics (mean of each captured metric across completed runs), and a table of per-item results. Each row in the per-item table MUST show the item's trigger payload (key fields), run status, and captured metrics.

#### Scenario: View completed eval run
- **WHEN** a user navigates to a completed eval run with 10 items and metric "relevance"
- **THEN** the page shows status "completed", aggregate relevance score, and 10 rows with per-item relevance scores

#### Scenario: View in-progress eval run
- **WHEN** a user views an eval run where 3 of 10 items are complete
- **THEN** the page shows a progress bar at 30%, aggregate metrics from the 3 completed items, and 10 rows (3 completed, 1 running, 6 pending)

#### Scenario: Drill down to individual run
- **WHEN** the user clicks on a per-item row
- **THEN** the user navigates to the existing run detail page for that pipeline run
