## ADDED Requirements

### Requirement: JSON object schema editor
The system SHALL replace the flat `TriggerSchemaField[]` field-list editor with a `@visual-json/react` `JsonEditor` component. The editor MUST be controlled (`value` / `onChange`) and MUST update the pipeline builder store's `triggerSchema` state on every change. The root value MUST always be a JSON object (`Record<string, unknown>`); scalar root values are not permitted.

#### Scenario: Edit a string field
- **WHEN** a user opens the Trigger Inputs panel and types a new key `"prompt"` with value `""`
- **THEN** the store's `triggerSchema` is updated to `{ "prompt": "" }` and the trigger node gains a `"prompt"` output handle

#### Scenario: Edit a nested object
- **WHEN** a user adds a key `"config"` with value `{}` and then adds `"temperature"` with value `0` inside it
- **THEN** `triggerSchema` is `{ "config": { "temperature": 0 } }` and only `"config"` appears as a top-level trigger node handle

#### Scenario: Remove a field
- **WHEN** a user deletes the key `"prompt"` from the editor
- **THEN** the store's `triggerSchema` no longer contains `"prompt"` and its corresponding handle is removed from the trigger node

### Requirement: Import schema from sample JSON
The system SHALL provide an "Import from JSON" collapsible section in the Trigger Inputs panel. Users SHALL be able to paste a raw JSON string into a textarea and click "Import". The system MUST parse the JSON, replace all leaf values with zero-value placeholders by type (string → `""`, number → `0`, boolean → `false`, array → `[]`, object → `{}`), and replace the current `triggerSchema` with the result.

#### Scenario: Import a flat payload
- **WHEN** a user pastes `{ "prompt": "hello world", "temperature": 0.7 }` and clicks Import
- **THEN** `triggerSchema` becomes `{ "prompt": "", "temperature": 0 }` and the editor reflects the new shape

#### Scenario: Import a nested payload
- **WHEN** a user pastes `{ "user": { "id": "abc", "role": "admin" }, "count": 5 }` and clicks Import
- **THEN** `triggerSchema` becomes `{ "user": { "id": "", "role": "" }, "count": 0 }`

#### Scenario: Invalid JSON input
- **WHEN** a user pastes malformed JSON and clicks Import
- **THEN** an inline error message is shown and `triggerSchema` is not modified

### Requirement: Zero-value placeholder inference
The system SHALL expose a pure `inferSchema(value: unknown): unknown` utility function that recursively replaces leaf values with zero-value placeholders. The function MUST preserve object structure and array element shape.

#### Scenario: Infer from mixed object
- **WHEN** `inferSchema({ a: "hello", b: 42, c: true, d: [1, 2], e: { x: "y" } })` is called
- **THEN** it returns `{ a: "", b: 0, c: false, d: [0], e: { x: "" } }`

#### Scenario: Infer from null or undefined
- **WHEN** `inferSchema(null)` is called
- **THEN** it returns `null`
