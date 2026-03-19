### Requirement: Save as template button in editor toolbar
The pipeline editor toolbar SHALL include a "Save as Template" button. The button SHALL be disabled when the editor has unsaved changes (`dirty === true`). When disabled, a tooltip SHALL display "Deploy your changes before saving as a template".

#### Scenario: Button enabled when no unsaved changes
- **WHEN** the pipeline editor has no unsaved changes (dirty is false)
- **THEN** the "Save as Template" button is enabled and clickable

#### Scenario: Button disabled when unsaved changes exist
- **WHEN** the pipeline editor has unsaved changes (dirty is true)
- **THEN** the "Save as Template" button is disabled with a tooltip explaining the user must deploy first

### Requirement: Save as template dialog
When the user clicks "Save as Template", a dialog SHALL appear with fields for template name (required) and description (optional). The name field SHALL be pre-filled with the current pipeline name. The dialog SHALL show a live slug preview as the user types.

#### Scenario: Dialog pre-fills pipeline name
- **WHEN** the user clicks "Save as Template" on a pipeline named "GPT-4o Eval"
- **THEN** the dialog opens with the name field pre-filled as "GPT-4o Eval" and slug preview showing "gpt-4o-eval"

#### Scenario: User customizes template name
- **WHEN** the user changes the template name in the dialog to "My Standard Eval"
- **THEN** the slug preview updates to "my-standard-eval"

### Requirement: Save as template submission
When the user submits the save-as-template dialog, the system SHALL capture the current pipeline's nodes, edges, and trigger schema from the Zustand store and POST them to `POST /api/templates`. On success, the dialog SHALL close. On error (e.g., duplicate slug), the error SHALL be displayed in the dialog.

#### Scenario: Successful template save
- **WHEN** the user fills in the template name and clicks Save, and the API returns 201
- **THEN** the dialog closes and the template is created

#### Scenario: Duplicate slug error
- **WHEN** the user saves a template with a name whose slug already exists in their org
- **THEN** the dialog displays the 409 error message without closing
