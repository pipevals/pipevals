## ADDED Requirements

### Requirement: Trigger node on canvas
The pipeline builder canvas SHALL display a special locked "Trigger" node that represents the runtime trigger payload. This node MUST be auto-created when a pipeline is first loaded and no trigger node exists in the stored nodes. It MUST NOT be deletable by the user. It MUST be visually distinct from step nodes (different color/icon). Its position MUST be persisted with the pipeline's node list so users can move it freely.

#### Scenario: Trigger node auto-created on first load
- **WHEN** a user opens a pipeline that has no trigger node
- **THEN** a "Trigger" node appears on the canvas at a default top-left position

#### Scenario: Trigger node cannot be deleted
- **WHEN** a user selects the trigger node and presses the delete key
- **THEN** the node remains on the canvas and no deletion occurs

#### Scenario: Trigger node position is saved
- **WHEN** a user drags the trigger node to a new position and saves
- **THEN** reopening the pipeline shows the trigger node at the saved position

### Requirement: Trigger node output handles
The trigger node SHALL display one output handle per field defined in the pipeline's trigger schema. Each handle MUST be labeled with the field name. When the trigger schema is empty, the trigger node MUST show a placeholder state indicating no fields are defined.

#### Scenario: Handles match schema fields
- **WHEN** the trigger schema defines fields `["prompt", "model"]`
- **THEN** the trigger node shows two output handles labeled "prompt" and "model"

#### Scenario: Empty schema placeholder
- **WHEN** the trigger schema has no fields
- **THEN** the trigger node shows a message such as "No inputs defined — add fields in the Trigger panel"

#### Scenario: Schema change updates handles
- **WHEN** a user adds a new field `"temperature"` to the trigger schema
- **THEN** the trigger node immediately shows a new "temperature" output handle

### Requirement: Wiring trigger fields to step inputs
The pipeline builder SHALL allow users to draw an edge from a trigger node handle to a step node's input handle. When such an edge is created, the system MUST automatically write `trigger.{fieldName}` into the corresponding config field of the target step. Trigger edges MUST be visually persisted on the canvas (so the wiring is visible). The trigger node and its edges MUST be excluded from the graph snapshot used during execution.

#### Scenario: Wire trigger field to step input
- **WHEN** a user draws an edge from the trigger node's "prompt" handle to an AI SDK node's prompt template input
- **THEN** the AI SDK node's `promptTemplate` config field is set to `"trigger.prompt"` and the edge is shown on the canvas

#### Scenario: Trigger edges excluded from execution snapshot
- **WHEN** a pipeline run is triggered
- **THEN** the graph snapshot does NOT include the trigger node or its edges; the execution engine still resolves `trigger.prompt` via the trigger payload at runtime

#### Scenario: Removing a trigger edge does not clear the config field
- **WHEN** a user deletes an edge from the trigger node to a step
- **THEN** the edge is removed visually but the `trigger.{fieldName}` string remains in the step's config field (the user must manually clear it if desired)
