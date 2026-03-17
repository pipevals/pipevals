## Why

Pipeline names are user-facing labels that should be freely editable, but the current `pipeline_name_org_uidx` unique constraint conflates identity with display. Adding a stable, URL-safe slug as the uniqueness anchor decouples naming flexibility from identity constraints and enables cleaner URLs for pipelines.

## What Changes

- **BREAKING**: Remove `uniqueIndex("pipeline_name_org_uidx")` on `(name, organizationId)` from the `pipeline` table
- Add a `slug` column (`text`, not null) to the `pipeline` table
- Add `uniqueIndex("pipeline_slug_org_uidx")` on `(slug, organizationId)`
- Auto-generate slug from the pipeline name as the user types in the create form
- Merge the new slug column and index into the existing migration (0000) rather than creating a separate migration, since the app is pre-production

## Capabilities

### New Capabilities

- `pipeline-slug`: Slug field on pipelines — generation from name, uniqueness enforcement per org, persistence and exposure in API responses

### Modified Capabilities

- `pipeline-api`: Create endpoint must accept/generate a slug, enforce slug+org uniqueness, and return slug in all pipeline responses
- `pipeline-builder-ui`: Create pipeline dialog must auto-derive and display slug from name input

## Impact

- `lib/db/pipeline-schema.ts`: Add `slug` column, replace name unique index with slug unique index
- `drizzle/0000_fair_toxin.sql` + `drizzle/meta/`: Merge slug column and new index into existing migration
- `app/api/pipelines/route.ts`: Generate slug on create, validate slug uniqueness, include slug in responses
- `app/api/pipelines/[id]/route.ts`: Include slug in GET responses
- Pipeline list response schema: Add `slug` field
- Create pipeline dialog/form: Add slug preview auto-populated from name
