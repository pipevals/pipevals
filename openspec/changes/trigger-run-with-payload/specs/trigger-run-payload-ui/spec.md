## ADDED Requirements

### Requirement: Trigger with payload dialog
The run list page SHALL provide a secondary "Trigger with payload…" button that opens a dialog containing a JSON textarea. The dialog MUST pre-fill the textarea with `{}`. The submit button MUST be disabled when the textarea content is not valid JSON. On submit, the system MUST merge the parsed payload with `{ source: "ui" }` and call `POST /api/pipelines/:id/runs` with the combined payload. The dialog MUST close and the run list MUST refresh after a successful trigger.

#### Scenario: Open dialog
- **WHEN** the user clicks "Trigger with payload…"
- **THEN** a dialog opens with a JSON textarea pre-filled with `{}`

#### Scenario: Submit valid payload
- **WHEN** the user enters valid JSON (e.g., `{ "prompt": "hello" }`) and clicks "Trigger"
- **THEN** the system calls the API with `{ "payload": { "prompt": "hello", "source": "ui" } }`, closes the dialog, and refreshes the run list

#### Scenario: Submit empty object
- **WHEN** the user leaves the textarea as `{}` and clicks "Trigger"
- **THEN** the system calls the API with `{ "payload": { "source": "ui" } }` and the run is created successfully

#### Scenario: Invalid JSON disables submit
- **WHEN** the user enters text that is not valid JSON (e.g., `{ bad json }`)
- **THEN** the submit button is disabled and an inline error message is shown

#### Scenario: Invalid JSON error message
- **WHEN** the textarea contains invalid JSON
- **THEN** an inline error message such as "Invalid JSON" is displayed below the textarea

#### Scenario: Cancel dialog
- **WHEN** the user clicks "Cancel" or presses Escape
- **THEN** the dialog closes without triggering a run

### Requirement: Preserve fast-trigger button
The run list page SHALL retain the existing "Trigger" button that immediately fires a run with `{ source: "ui" }` as the payload, with no dialog. Both buttons MUST be visible simultaneously.

#### Scenario: Fast trigger still works
- **WHEN** the user clicks the original "Trigger" button
- **THEN** the run is triggered immediately with `{ source: "ui" }`, without opening any dialog
