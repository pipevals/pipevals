## ADDED Requirements

### Requirement: Workflow inspect icon-button in RunSummary
The RunSummary bar SHALL display a WDK staircase icon-button that opens the workflow run's inspect page in a new tab. The icon-button SHALL be placed at the end of the summary bar, after the step count stats.

#### Scenario: Icon visible when workflowRunId exists and env var is set
- **WHEN** a pipeline run has a non-null `workflowRunId` AND `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` is set
- **THEN** the WDK staircase icon-button is visible in the RunSummary bar with tooltip "Inspect in Workflow DevKit"

#### Scenario: Icon hidden when workflowRunId is null
- **WHEN** a pipeline run has a null `workflowRunId` (e.g., workflow failed to start)
- **THEN** the icon-button is not rendered

#### Scenario: Icon hidden when env var is unset
- **WHEN** `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` is not set or empty
- **THEN** the icon-button is not rendered

### Requirement: URL construction for local WDK backend
The system SHALL construct a local WDK deep-link using query parameters when the configured URL does not contain `vercel.com`.

#### Scenario: Local deep-link format
- **WHEN** `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` is `http://localhost:3456` and `workflowRunId` is `run_abc123`
- **THEN** the link target SHALL be `http://localhost:3456?resource=run&id=run_abc123`

### Requirement: URL construction for Vercel backend
The system SHALL construct a Vercel dashboard deep-link using path segments when the configured URL contains `vercel.com`.

#### Scenario: Vercel deep-link format
- **WHEN** `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` is `https://vercel.com/my-team/pipevals/observability/workflows` and `workflowRunId` is `run_abc123`
- **THEN** the link target SHALL be `https://vercel.com/my-team/pipevals/observability/workflows/runs/run_abc123?environment=production`

### Requirement: workflowRunId available in client-side RunData
The `RunData` interface SHALL include `workflowRunId: string | null` so the RunSummary component can access it.

#### Scenario: workflowRunId flows from API to store
- **WHEN** the run detail API returns a run with `workflowRunId: "run_abc123"`
- **THEN** the `RunData` object in the Zustand store SHALL have `workflowRunId` equal to `"run_abc123"`
