## Context

The pipeline run API (`POST /api/pipelines/:id/runs`) already accepts an optional `payload` field and stores it as `trigger_payload` (JSONB) in the database. Pipeline steps can reference this payload via template expressions (e.g., `{{ trigger.prompt }}`). However, the UI "Trigger" button in `run-list-page-content.tsx` always sends `{ source: "ui" }` — users have no way to supply runtime values when triggering a run manually.

## Goals / Non-Goals

**Goals:**
- Add a UI dialog that lets users enter a JSON payload before triggering a run.
- Merge the user-supplied payload with `{ source: "ui" }` before sending to the API.
- Validate JSON syntax in the dialog before enabling the submit button.
- Keep the fast "Trigger" button as the primary CTA (no payload, immediate fire).

**Non-Goals:**
- Schema-driven forms derived from the pipeline definition (no introspection of what inputs steps expect).
- Saving/reusing previous payloads across sessions.
- Changes to the API, database schema, or step execution engine.

## Decisions

### 1. Dialog over inline form
Use a `shadcn/ui` Dialog containing a `<textarea>` pre-filled with `{}` rather than an inline form. The run list page is already content-heavy; a dialog avoids layout disruption and keeps the trigger action intentional.

*Alternative considered*: An inline expandable panel below the trigger button. Rejected because it would push the run list down and complicate the layout.

### 2. Two trigger buttons
Keep the existing "Trigger" button (sends `{ source: "ui" }` immediately) and add a secondary "Trigger with payload…" button that opens the dialog. This preserves the fast-trigger flow for users who don't need custom payloads.

*Alternative considered*: Replace the single button with a split-button (primary action + chevron dropdown). More compact but adds complexity and is unfamiliar in the current design language.

### 3. Client-side JSON validation only
Validate that the textarea content is parseable JSON (`JSON.parse`) before enabling the submit button. Show an inline error message on parse failure. No server-side schema validation beyond what already exists.

### 4. Co-locate dialog component
Implement the dialog as a new component `components/pipeline/trigger-with-payload-dialog.tsx` and import it into `run-list-page-content.tsx`. Keeps the dialog self-contained and independently testable.

## Risks / Trade-offs

- **User confusion** → Users may not know what keys the pipeline expects. Mitigation: placeholder text in the textarea hints at the format; future work can add schema hints.
- **Large payloads** → No size limit enforced client-side. Mitigation: the existing API and DB already handle arbitrary JSONB; this is acceptable for the current scale.

## Migration Plan

No migration required. All backend infrastructure is already in place. The change is additive UI-only and can be deployed independently.

## Open Questions

- Should the textarea have a minimum height or auto-grow? (Lean toward fixed height with scroll for simplicity.)
- Should `{ source: "ui" }` be visible in the pre-filled payload or merged silently? (Lean toward silent merge to keep the UX clean.)
