## ADDED Requirements

### Requirement: Trigger inputs panel
The pipeline builder sidebar SHALL display a "Trigger Inputs" panel when the trigger node is selected or when no node is selected. The panel MUST list the current trigger schema fields with their names and descriptions. Users MUST be able to add new fields, remove existing fields, and edit field names and descriptions. Changes MUST update the pipeline builder store immediately and be persisted when the pipeline is saved.

#### Scenario: View trigger inputs panel
- **WHEN** a user opens a pipeline and no node is selected
- **THEN** the sidebar shows the "Trigger Inputs" panel listing any defined trigger fields

#### Scenario: Add a trigger field
- **WHEN** a user clicks "Add field" in the trigger inputs panel and enters name `"prompt"`
- **THEN** a new field appears in the list and the trigger node gains a corresponding output handle

#### Scenario: Remove a trigger field
- **WHEN** a user clicks the remove button next to the `"model"` field
- **THEN** the field is removed from the list and the trigger node's `"model"` handle disappears

#### Scenario: Edit field description
- **WHEN** a user edits the description of the `"prompt"` field to `"The text to evaluate"`
- **THEN** the updated description is stored in the trigger schema

### Requirement: Trigger node wiring in builder
The pipeline builder canvas SHALL prevent users from connecting edges that originate from a step node to the trigger node's input (the trigger node has no input handle). The trigger node MUST only have output handles. When a user successfully wires a trigger handle to a step input, the config panel for the target step MUST reflect the updated value (`trigger.{fieldName}`) immediately.

#### Scenario: Trigger node has no input handle
- **WHEN** a user attempts to draw an edge from a step node's output to the trigger node
- **THEN** the connection is rejected (no input handle is available on the trigger node)

#### Scenario: Config panel updates after wiring
- **WHEN** a user wires the trigger "prompt" handle to an AI SDK node's prompt template input
- **THEN** opening the AI SDK node's config panel shows `"trigger.prompt"` in the prompt template field
