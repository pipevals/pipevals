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

The system SHALL provide a sidebar palette listing all available step types organized into categories:
- **Execute**: API Request, AI SDK, Sandbox
- **Flow**: Condition, Transform
- **Measure**: Metric Capture
- **Review**: Human Review

Users MUST be able to drag a step type from the palette onto the canvas to create a new node of that type. Each category MUST have a visual separator or heading.

#### Scenario: Drag node from palette

- **WHEN** a user drags "AI SDK" from the palette onto the canvas at position (300, 200)
- **THEN** a new AI SDK node is created at that position with default config and a default label

#### Scenario: Palette lists all step types in categories

- **WHEN** the palette is rendered
- **THEN** it displays all seven step types organized into four categories: Execute (3), Flow (2), Measure (1), Review (1)

#### Scenario: Drag human review from palette

- **WHEN** a user drags "Human Review" from the Review category onto the canvas
- **THEN** a new human_review node is created with default config (empty display, empty rubric, requiredReviewers: 1)

### Requirement: Node connection

The system SHALL allow users to draw edges between nodes by dragging from an output handle to an input handle. Condition nodes MUST display labeled output handles (e.g., "true"/"false" or custom labels). The system MUST prevent connections that would create a cycle. Condition node output handle arrays MUST be memoized to prevent unnecessary re-renders during canvas interactions. Upon creating a new connection, the system MUST automatically populate the target node's config by reading the source step type's output port declarations and the target step type's input port declarations from the step registry. The auto-wire algorithm MUST:

1. Look up the source type's output ports. If the outputs array is empty, skip auto-wire entirely.
2. Use the first output port's key to construct the dot-path (`steps.<sourceLabel>.<key>` or `trigger.<firstSchemaKey>`).
3. Look up the target type's input ports. Use the first input port.
4. Apply the port's mode: `scalar` sets the config field if empty, `additive` merges a new entry, `template` calls the generate function if empty.

This auto-wire MUST NOT overwrite existing non-empty string fields (for scalar and template modes). The resulting behavior MUST be identical to the current per-type auto-wire rules.

#### Scenario: Draw an edge between two nodes

- **WHEN** a user drags from node A's output handle to node B's input handle
- **THEN** an edge is created connecting A to B

#### Scenario: Prevent cycle creation

- **WHEN** a user attempts to draw an edge that would create a cycle
- **THEN** the connection is rejected and the edge is not created

#### Scenario: Condition node handles

- **WHEN** a condition node is on the canvas
- **THEN** it displays distinct output handles labeled with the branch names (e.g., "true", "false")

#### Scenario: Auto-wire ai_sdk target from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to another ai_sdk node whose promptTemplate is empty
- **THEN** the target node's promptTemplate is set to `steps.llm.text` (derived from ai_sdk's output port key "text" and ai_sdk's scalar input port on "promptTemplate")

#### Scenario: Auto-wire api_request body from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to an api_request node
- **THEN** a new bodyTemplate entry with value `steps.llm.text` and an empty key is added (derived from api_request's additive input port on "bodyTemplate")

#### Scenario: Auto-wire sandbox code from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to a sandbox node whose code is empty
- **THEN** the sandbox node's code is set to a starter template that reads `input["steps"]["llm"]["text"]` (derived from sandbox's template input port on "code")

#### Scenario: Auto-wire sandbox code does not overwrite existing code

- **WHEN** a user connects any source node to a sandbox node whose code already contains content
- **THEN** the existing code is preserved and no auto-wire mutation occurs (template mode skips non-empty fields)

#### Scenario: Auto-wire condition expression from api_request source

- **WHEN** a user connects an api_request node with label "fetch" to a condition node whose expression is empty
- **THEN** the target node's expression is set to `steps.fetch.body != null` (derived from condition's scalar input port on "expression", with the ` != null` suffix applied by the port's value transform)

#### Scenario: Auto-wire transform mapping from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "gen" to a transform node
- **THEN** a new mapping entry with value `steps.gen.text` and an empty key is added (derived from transform's additive input port on "mapping")

#### Scenario: Auto-wire metric_capture from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "eval" to a metric_capture node
- **THEN** a new metrics entry with value `steps.eval.text` and an empty key is added (derived from metric_capture's additive input port on "metrics")

#### Scenario: Auto-wire target from trigger source

- **WHEN** a user connects the trigger node (schema has key "prompt") to an ai_sdk node whose promptTemplate is empty
- **THEN** the target node's promptTemplate is set to `trigger.prompt`

#### Scenario: Auto-wire does not overwrite existing config

- **WHEN** a user connects node A to an ai_sdk target node whose promptTemplate already has a value
- **THEN** the existing value is preserved and not overwritten (scalar mode skips non-empty fields)

#### Scenario: Auto-wire skips sandbox source

- **WHEN** a user connects a sandbox node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config (sandbox has empty outputs array)

#### Scenario: Auto-wire skips condition source

- **WHEN** a user connects a condition node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config (condition has empty outputs array)

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

### Requirement: Trigger node wiring in builder
The pipeline builder canvas SHALL prevent users from connecting edges that originate from a step node to the trigger node's input (the trigger node has no input handle). The trigger node MUST only have output handles. When a user successfully wires a trigger handle to a step input, the config panel for the target step MUST reflect the updated value (`trigger.{fieldName}`) immediately.

#### Scenario: Trigger node has no input handle
- **WHEN** a user attempts to draw an edge from a step node's output to the trigger node
- **THEN** the connection is rejected (no input handle is available on the trigger node)

#### Scenario: Config panel updates after wiring
- **WHEN** a user wires the trigger "prompt" handle to an AI SDK node's prompt template input
- **THEN** opening the AI SDK node's config panel shows `"trigger.prompt"` in the prompt template field

### Requirement: Trigger inputs panel
The system SHALL render a Trigger Inputs panel in the pipeline builder sidebar when no step node is selected or when the trigger node is selected. The panel MUST display a `@visual-json/react` `JsonEditor` bound to the pipeline's `triggerSchema` (`Record<string, unknown>`). Changes in the editor MUST immediately update `triggerSchema` in the store (marking the pipeline dirty). The panel MUST also display a collapsible "Import from JSON" section for pasting a sample payload. The previous flat field-list UI (add-by-name inputs, `FieldRow` component, description field) SHALL be removed.

#### Scenario: Open panel with empty schema
- **WHEN** the trigger node is selected and `triggerSchema` is `{}`
- **THEN** the panel shows the JSON editor with an empty object and the Import section collapsed

#### Scenario: Edit schema in panel
- **WHEN** a user adds key `"prompt"` with value `""` in the editor
- **THEN** `triggerSchema` is updated to `{ "prompt": "" }` and the pipeline is marked dirty

#### Scenario: Import replaces schema
- **WHEN** a user pastes a valid JSON sample and clicks Import
- **THEN** the editor updates to show the inferred schema and `triggerSchema` in the store is replaced

### Requirement: Human review config panel

The system SHALL render a config panel for `human_review` nodes with three sections:

**Display Data section**: A key-value editor where keys are display labels (strings) and values are dot-path expressions. Users MUST be able to add and remove display entries.

**Rubric section**: A list editor for rubric fields. Each field row MUST show the field name, type selector (rating, boolean, text, select), and type-specific options:
- For `rating`: min and max number inputs
- For `boolean`: the label text
- For `text`: optional placeholder
- For `select`: a comma-separated list of options

Users MUST be able to add new rubric fields and remove existing ones.

**Reviewers section**: A number input for `requiredReviewers` with a minimum value of 1.

#### Scenario: Add a rating rubric field

- **WHEN** a user clicks "Add field" in the rubric section and configures it as name: "accuracy", type: "rating", min: 1, max: 5
- **THEN** the rubric array in the node's config is updated with the new field

#### Scenario: Edit display mapping

- **WHEN** a user adds a display entry with label "AI Response" and path "steps.llm.text"
- **THEN** the `display` config is updated to include `{ "AI Response": "steps.llm.text" }`

#### Scenario: Set required reviewers

- **WHEN** a user sets the required reviewers field to 3
- **THEN** the node's `requiredReviewers` config is updated to 3
