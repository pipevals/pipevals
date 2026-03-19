## Why

New users land on an empty `/pipelines` page with no guidance on how to get started. We already have three well-designed seed pipelines that demonstrate core evaluation patterns, but they're only loadable via a CLI script (`bun run scripts/seed-pipelines.ts --org <id>`). Surfacing these as templates in the UI — and letting users save their own pipelines as templates — dramatically reduces time-to-first-pipeline and encourages reuse of proven patterns within an organization.

## What Changes

- **New `pipeline_template` DB table** storing template metadata + a frozen graph snapshot (nodes/edges as JSONB). Templates with `organizationId = NULL` are built-in (visible to all); templates with an `organizationId` are scoped to that org.
- **New templates API** (`GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/:id`) for listing, creating org-scoped, and deleting templates.
- **Extended pipeline creation API** — `POST /api/pipelines` accepts an optional `templateId` to clone a template's graph into the new pipeline.
- **Template picker in "New Pipeline" flow** — the creation UI shows available templates (built-in + org-scoped) before the name input. Also shown prominently in the empty state on `/pipelines`.
- **"Save as Template" in pipeline editor** — a toolbar button (disabled when there are unsaved changes) that snapshots the current deployed graph as an org-scoped template.
- **Convert seed pipelines to built-in templates** — the existing `seedPipelineDefinitions` array targets the new `pipeline_template` table instead of creating pipelines directly. The `seedPipelines()` function is replaced by `seedTemplates()`.

## Capabilities

### New Capabilities
- `template-storage`: DB table, schema, and seed logic for pipeline templates (built-in and org-scoped)
- `template-api`: REST endpoints for listing, creating, and deleting templates; extended pipeline creation with `templateId`
- `template-picker-ui`: Template selection UI in the "New Pipeline" flow and empty state
- `save-as-template`: "Save as Template" button in the pipeline editor toolbar

### Modified Capabilities
- `seed-pipelines`: Seed definitions now target `pipeline_template` table as built-in templates instead of creating pipelines directly
- `pipeline-api`: `POST /api/pipelines` accepts optional `templateId` to create from template

## Impact

- **Database**: New `pipeline_template` table + migration. No changes to existing tables.
- **API**: New `/api/templates` routes. Extended `POST /api/pipelines` body schema.
- **UI**: Modified `PipelineList` (template picker + empty state), modified `PipelineToolbar` (save as template button).
- **Seeds**: `seedPipelines()` replaced by `seedTemplates()` — existing seeded pipelines in orgs are unaffected but no new ones will be created via the old path.
- **Dependencies**: No new dependencies.
