## MODIFIED Requirements

### Requirement: Pipeline canvas
The system SHALL render an xyflow canvas where users can view and interact with pipeline nodes and edges. The canvas MUST support pan, zoom, and minimap navigation. The canvas MUST load its state from the database and persist changes on save. The canvas component MUST be dynamically imported with SSR disabled to avoid including ReactFlow in the initial page bundle.

#### Scenario: Load pipeline into canvas
- **WHEN** a user navigates to a pipeline's editor page
- **THEN** a loading skeleton is shown while the canvas component loads, then the canvas renders all nodes at their stored positions with edges connecting them

#### Scenario: Pan and zoom
- **WHEN** a user scrolls or pinches on the canvas
- **THEN** the viewport zooms in/out and the user can pan to navigate large pipelines

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
