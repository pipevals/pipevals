## MODIFIED Requirements

### Requirement: Run summary
The system SHALL display a summary panel for the run showing overall status, total duration, number of steps completed/failed/skipped, and captured metrics. Metrics MUST be extracted from metric_capture step results. The run viewer page MUST include a sub-navigation component shared across all pipeline views (Editor, Metrics, Runs) to allow users to switch between pipeline pages.

#### Scenario: View run summary
- **WHEN** a user views a completed run that captured metrics "accuracy" (0.85) and "latency" (1200ms)
- **THEN** the summary panel shows status: completed, total duration, 7/7 steps completed, and the two metrics with their values

#### Scenario: Sub-navigation visible on run viewer
- **WHEN** a user is on a pipeline run viewer page
- **THEN** a sub-navigation with links to Editor, Metrics, and Runs is visible, with Runs shown as the active section
