## MODIFIED Requirements

### Requirement: Run viewer canvas
The system SHALL render the pipeline graph on an xyflow canvas in read-only mode when viewing a run. The graph MUST be loaded from the run's graph_snapshot (not from the live pipeline definition) so it shows the exact graph that was executed. Nodes MUST be positioned according to the snapshot's stored positions. The canvas MUST NOT allow editing (no dragging nodes, no creating/deleting edges). The canvas component MUST be dynamically imported with SSR disabled to avoid including ReactFlow in the initial page bundle.

#### Scenario: Open run viewer
- **WHEN** a user navigates to a specific pipeline run
- **THEN** a loading skeleton is shown while the canvas component loads, then the canvas renders the graph from the run's snapshot with all editing interactions disabled

#### Scenario: Viewer shows executed graph after pipeline edit
- **WHEN** a user views a run that was triggered before the pipeline was edited
- **THEN** the canvas shows the graph as it was at trigger time, not the current pipeline state
