## ADDED Requirements

### Requirement: Run viewer canvas
The system SHALL render the pipeline graph on an xyflow canvas in read-only mode when viewing a run. The graph MUST be loaded from the run's graph_snapshot (not from the live pipeline definition) so it shows the exact graph that was executed. Nodes MUST be positioned according to the snapshot's stored positions. The canvas MUST NOT allow editing (no dragging nodes, no creating/deleting edges). The canvas component MUST be dynamically imported with SSR disabled to avoid including ReactFlow in the initial page bundle.

#### Scenario: Open run viewer
- **WHEN** a user navigates to a specific pipeline run
- **THEN** a loading skeleton is shown while the canvas component loads, then the canvas renders the graph from the run's snapshot with all editing interactions disabled

#### Scenario: Viewer shows executed graph after pipeline edit
- **WHEN** a user views a run that was triggered before the pipeline was edited
- **THEN** the canvas shows the graph as it was at trigger time, not the current pipeline state

### Requirement: Node status badges
The system SHALL display a status badge on each node reflecting its execution state in the current run. Statuses MUST include: pending (not yet reached), running (currently executing), completed (success), failed (error), and skipped (on inactive conditional branch). The badge MUST update as new step_results are fetched.

#### Scenario: Node completes
- **WHEN** a step_result for a node transitions to `completed`
- **THEN** the node's badge updates to show a completed indicator

#### Scenario: Node fails
- **WHEN** a step_result for a node transitions to `failed`
- **THEN** the node's badge updates to show a failed indicator with error styling

#### Scenario: Node on inactive branch
- **WHEN** a conditional branch is not taken
- **THEN** nodes on that branch display no badge or a dimmed/skipped indicator

### Requirement: Node result inspection
The system SHALL allow users to click a node in the run viewer to see its execution details. The detail panel MUST show the node's resolved input, output, error (if any), duration, and timestamps.

#### Scenario: Inspect completed node
- **WHEN** a user clicks a completed node in the run viewer
- **THEN** a panel shows the node's input JSON, output JSON, and duration in milliseconds

#### Scenario: Inspect failed node
- **WHEN** a user clicks a failed node
- **THEN** a panel shows the node's input JSON, error details, and the timestamp of failure

### Requirement: Live progress polling
The system SHALL poll the run status API at a regular interval while the run status is `pending` or `running`. The polling interval MUST be configurable (default: 2 seconds). Polling MUST stop when the run reaches a terminal status (`completed` or `failed`).

#### Scenario: Live update during run
- **WHEN** a run is in progress and a step completes between polls
- **THEN** the next poll fetches updated step_results and the canvas reflects the new status

#### Scenario: Stop polling on completion
- **WHEN** the run transitions to `completed`
- **THEN** polling stops and the final state is displayed

### Requirement: Edge highlighting
The system SHALL highlight active edges in the run viewer to show the data flow path that was taken. Edges on active branches MUST be visually distinct from edges on inactive branches. Edges between completed nodes MUST show as "traversed."

#### Scenario: Active path highlighting
- **WHEN** a run completes with a conditional branch where only the "true" path was taken
- **THEN** edges on the "true" path are highlighted as traversed, edges on the "false" path are dimmed

### Requirement: Run summary
The system SHALL display a summary panel for the run showing overall status, total duration, number of steps completed/failed/skipped, and captured metrics. Metrics MUST be extracted from metric_capture step results.

#### Scenario: View run summary
- **WHEN** a user views a completed run that captured metrics "accuracy" (0.85) and "latency" (1200ms)
- **THEN** the summary panel shows status: completed, total duration, 7/7 steps completed, and the two metrics with their values
