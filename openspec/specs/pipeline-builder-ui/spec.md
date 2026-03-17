## ADDED Requirements

### Requirement: Pipeline canvas
The system SHALL render an xyflow canvas where users can view and interact with pipeline nodes and edges. The canvas MUST support pan, zoom, and minimap navigation. The canvas MUST load its state from the database and persist changes on save. The canvas component MUST be dynamically imported with SSR disabled to avoid including ReactFlow in the initial page bundle.

#### Scenario: Load pipeline into canvas
- **WHEN** a user navigates to a pipeline's editor page
- **THEN** a loading skeleton is shown while the canvas component loads, then the canvas renders all nodes at their stored positions with edges connecting them

#### Scenario: Pan and zoom
- **WHEN** a user scrolls or pinches on the canvas
- **THEN** the viewport zooms in/out and the user can pan to navigate large pipelines

### Requirement: Node palette
The system SHALL provide a sidebar palette listing all available step types: API Request, AI SDK, Sandbox, Condition, Transform, Metric Capture. Users MUST be able to drag a step type from the palette onto the canvas to create a new node of that type.

#### Scenario: Drag node from palette
- **WHEN** a user drags "AI SDK" from the palette onto the canvas at position (300, 200)
- **THEN** a new AI SDK node is created at that position with default config and a default label

#### Scenario: Palette lists all step types
- **WHEN** the palette is rendered
- **THEN** it displays all six step types with icons and labels

### Requirement: Node connection
The system SHALL allow users to draw edges between nodes by dragging from an output handle to an input handle. Condition nodes MUST display labeled output handles (e.g., "true"/"false" or custom labels). The system MUST prevent connections that would create a cycle. Condition node output handle arrays MUST be memoized to prevent unnecessary re-renders during canvas interactions.

#### Scenario: Draw an edge between two nodes
- **WHEN** a user drags from node A's output handle to node B's input handle
- **THEN** an edge is created connecting A to B

#### Scenario: Prevent cycle creation
- **WHEN** a user attempts to draw an edge that would create a cycle
- **THEN** the connection is rejected and the edge is not created

#### Scenario: Condition node handles
- **WHEN** a condition node is on the canvas
- **THEN** it displays distinct output handles labeled with the branch names (e.g., "true", "false")

### Requirement: Node configuration panel
The system SHALL display a configuration panel when a node is selected. The panel MUST show type-specific form fields matching the node's config schema. Changes in the panel MUST update the node's config in the store.

#### Scenario: Configure an AI SDK node
- **WHEN** a user selects an AI SDK node
- **THEN** the panel shows fields for provider, model, prompt template, temperature, and max tokens

#### Scenario: Configure a condition node
- **WHEN** a user selects a condition node
- **THEN** the panel shows an expression field and a list of output handles that can be added/removed/renamed

#### Scenario: Configure an API request node
- **WHEN** a user selects an API request node
- **THEN** the panel shows fields for URL, HTTP method, headers, and body template with dot-path expression support

### Requirement: Pipeline save and load
The system SHALL persist the full graph state (all nodes with positions and configs, all edges) to the database when the user saves. The system MUST load the persisted state when the user opens a pipeline.

#### Scenario: Save pipeline
- **WHEN** a user clicks save (or triggers auto-save)
- **THEN** all nodes and edges are persisted to the database, including position and config changes

#### Scenario: Reload preserves layout
- **WHEN** a user closes and reopens a pipeline
- **THEN** all nodes appear at their previously saved positions with their configs intact

### Requirement: Delete nodes and edges
The system SHALL allow users to select and delete nodes and edges from the canvas. Deleting a node MUST also remove all edges connected to it.

#### Scenario: Delete a node
- **WHEN** a user selects a node and presses delete
- **THEN** the node and all its connected edges are removed from the canvas and marked for deletion on save

#### Scenario: Delete an edge
- **WHEN** a user selects an edge and presses delete
- **THEN** the edge is removed from the canvas

### Requirement: Slug preview in create pipeline form
The system MUST display a read-only slug preview below the name input in the create pipeline inline form. The preview MUST update in real-time as the user types the pipeline name, showing the slugified value that will be assigned. The preview MUST use muted/secondary text styling to distinguish it from the editable name field.

#### Scenario: Slug preview updates as user types
- **WHEN** a user types `"My Evaluation"` into the pipeline name input
- **THEN** a read-only preview shows `"Slug: my-evaluation"` below the input field

#### Scenario: Slug preview for special characters
- **WHEN** a user types `"GPT-4o Test!!"` into the pipeline name input
- **THEN** the preview shows `"Slug: gpt-4o-test"`

#### Scenario: Empty name shows no slug preview
- **WHEN** the pipeline name input is empty
- **THEN** no slug preview is shown
