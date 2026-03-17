## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Trigger field list editor
**Reason**: Replaced by `@visual-json/react` JSON editor. The flat field-list approach (add-by-name input, per-field description, `FieldRow` component) cannot express nested JSON structures and is less intuitive than editing the JSON directly.
**Migration**: No user-facing migration needed — the `trigger_schema` DB column is unchanged (still JSONB). Existing pipelines with `[]` or `{}` schema will display an empty JSON editor.
