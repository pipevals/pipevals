## Why

The pipeline run API already accepts a `triggerPayload` field and stores it in the database, but the UI trigger button sends a hardcoded `{ source: "ui" }` — there is no way for a user to provide runtime input when manually triggering a pipeline run from the UI.

## What Changes

- Add a "Trigger with payload" dialog to the run list page that lets users supply a JSON payload before firing a run.
- The dialog validates that the input is valid JSON before submitting.
- The existing trigger button becomes the primary CTA; the new dialog is a secondary action.
- No changes to the API, database schema, or step-execution logic — all backend infrastructure already exists.

## Capabilities

### New Capabilities
- `trigger-run-payload-ui`: UI dialog that allows users to enter an arbitrary JSON payload when manually triggering a pipeline run from the run list page.

### Modified Capabilities
- `pipeline-api`: The UI now sends the full user-supplied payload object (merged with `{ source: "ui" }`) to the existing `POST /api/pipelines/[id]/runs` endpoint.

## Impact

- **UI**: `components/pipeline/run-list-page-content.tsx` — adds a secondary trigger button and a dialog component.
- **API**: No changes required; the endpoint already accepts `payload`.
- **Database**: No schema changes; `trigger_payload` column already exists.
- **Tests**: New unit/integration tests for the dialog component and updated API trigger tests.
