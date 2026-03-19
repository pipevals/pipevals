## 1. Database Schema & Migration

- [x] 1.1 Add `pipelineTemplates` table definition to `lib/db/pipeline-schema.ts` with all columns, partial unique indexes, and FK constraints
- [x] 1.2 Add Drizzle relations for `pipelineTemplates` (organization, creator)
- [x] 1.3 Export the new table from `lib/db/schema.ts`
- [x] 1.4 Generate and apply the Drizzle migration (`bun drizzle-kit generate` + `bun drizzle-kit migrate`)

## 2. Seed Templates

- [x] 2.1 Create `lib/db/seed-templates.ts` with `seedTemplates()` function that inserts the 3 existing seed definitions into `pipeline_template` with `organizationId = NULL` and `createdBy = NULL`, using the `graphSnapshot` JSONB shape
- [x] 2.2 Create `scripts/seed-templates.ts` CLI script (no `--org` flag required)
- [x] 2.3 Update seed-pipelines test or add new test for `seedTemplates()` idempotency
- [x] 2.4 Remove `scripts/seed-pipelines.ts` and `lib/db/seed-pipelines.ts` (keep definitions accessible to the new seed-templates module)

## 3. Templates API

- [x] 3.1 Create `app/api/templates/route.ts` with `GET` (list built-in + org-scoped) and `POST` (create org-scoped template with name, description, graphSnapshot, triggerSchema)
- [x] 3.2 Create `app/api/templates/[id]/route.ts` with `DELETE` (org-scoped only, reject built-in)
- [x] 3.3 Add unit tests for templates API (list visibility, create, duplicate slug 409, delete org-scoped, reject delete built-in)

## 4. Extended Pipeline Creation

- [x] 4.1 Extend `POST /api/pipelines` to accept optional `templateId` in the request body schema
- [x] 4.2 Implement template-to-pipeline cloning: fetch template, generate fresh UUIDs for nodes/edges with reference remapping, insert atomically
- [x] 4.3 Add unit tests for pipeline creation from template (happy path, invalid template 404, fresh UUIDs)

## 5. Template Picker UI

- [ ] 5.1 Fetch templates in the `/pipelines` page and pass them to `PipelineList` as a prop
- [ ] 5.2 Add template picker to the "New Pipeline" creation form in `PipelineList` — show template cards (name, description, built-in badge) with "Start from scratch" option
- [ ] 5.3 Submit selected `templateId` alongside `name` in `onCreate`
- [ ] 5.4 Update empty state (zero pipelines) to prominently display template cards with create CTAs

## 6. Save as Template (Editor)

- [ ] 6.1 Add "Save as Template" button to `PipelineToolbar` — disabled when `dirty === true` with tooltip "Deploy your changes before saving as a template"
- [ ] 6.2 Create save-as-template dialog component with name (pre-filled from pipeline name), description, and live slug preview
- [ ] 6.3 Wire dialog submission to `POST /api/templates` using current nodes, edges, and triggerSchema from the Zustand store
- [ ] 6.4 Handle success (close dialog) and error (display in dialog, e.g., 409 duplicate slug)
