## Context

Pipeline creation currently starts from a blank slate — users click "New Pipeline", type a name, and get an empty graph. We have three seed pipeline definitions hardcoded in `lib/db/seed-pipelines.ts` that demonstrate core evaluation patterns (AI-as-a-Judge, Model A/B Comparison, Human-in-the-Loop Review), but they're only loadable via a CLI script. There's no way for users to save their own pipelines as reusable starting points.

The `pipelineRuns` table already uses a `graphSnapshot` JSONB column to freeze a pipeline's graph at execution time — we can reuse this proven pattern for templates.

## Goals / Non-Goals

**Goals:**
- Users can create pipelines from built-in or org-scoped templates
- Users can save an existing pipeline as an org-scoped template from the editor
- Built-in templates replace CLI-seeded pipelines as the primary onboarding mechanism
- Templates are visible in both the "New Pipeline" flow and the empty state on `/pipelines`

**Non-Goals:**
- Template versioning or update-in-place (templates are immutable snapshots)
- Cross-org sharing beyond built-in templates (no community marketplace)
- Template preview/read-only graph viewer (users see name + description, then create to explore)
- Editing a template after creation (delete and re-save instead)

## Decisions

### 1. Single table with nullable `organizationId` for scoping

**Decision**: One `pipeline_template` table. `organizationId = NULL` means built-in (visible to all); non-null means org-scoped.

**Why over a `builtIn` boolean**: The nullable FK is the source of truth for visibility — no risk of a `builtIn=true` template that also has an `organizationId`, no redundant state. Queries are simpler: `WHERE organization_id IS NULL OR organization_id = :orgId`.

**Why over separate tables**: Built-in and org-scoped templates have identical shapes. Two tables would mean duplicated queries, types, and API logic for no structural benefit.

### 2. JSONB `graphSnapshot` column (not separate template_nodes/template_edges tables)

**Decision**: Store the full graph as `{ nodes: [...], edges: [...] }` in a single JSONB column, same shape as `pipelineRuns.graphSnapshot`.

**Why**: Templates are immutable snapshots — there's no need to query individual nodes or edges within a template. A JSONB blob is simpler (one table, not three), faster to read/write, and consistent with the existing `graphSnapshot` pattern on runs. When creating a pipeline from a template, we deserialize, assign fresh UUIDs, and insert — same as what `seedPipelines()` already does.

### 3. Template creation snapshots the last-saved (deployed) graph

**Decision**: The "Save as Template" button is disabled when the editor has unsaved changes (`dirty === true`). Templates always represent a graph that was deployed to the database.

**Why**: This avoids templating half-edited or broken graphs. The invariant is simple: every template corresponds to a graph that passed validation and was persisted. Tooltip on disabled state: "Deploy your changes before saving as a template".

### 4. Fresh UUIDs when creating from template

**Decision**: When `POST /api/pipelines` receives a `templateId`, the handler generates new UUIDs for all nodes and edges (remapping edge source/target references). The template's original IDs are not preserved.

**Why**: Node IDs must be unique across the system (they're PKs in `pipeline_node`). Reusing template IDs would collide if two pipelines are created from the same template. A UUID remap during insertion is straightforward — build an `oldId → newId` map, apply it to edges.

### 5. Seed migration: `seedTemplates()` replaces `seedPipelines()`

**Decision**: The existing `seedPipelineDefinitions` array is repurposed to seed the `pipeline_template` table with `organizationId = NULL`. The `seedPipelines()` function and its CLI script are replaced by `seedTemplates()`. Existing pipelines created by the old seeder remain untouched.

**Why**: Templates are the new onboarding path. Users should create pipelines from templates, not have pre-built pipelines magically appear in their org. This makes the onboarding explicit and user-driven.

### 6. Uniqueness constraints

**Decision**: Two partial unique indexes:
- `UNIQUE (slug, organization_id) WHERE organization_id IS NOT NULL` — org-scoped templates
- `UNIQUE (slug) WHERE organization_id IS NULL` — built-in templates

**Why**: Standard `UNIQUE (slug, organization_id)` treats NULLs as distinct in Postgres, so two built-in templates could share a slug. Partial indexes handle this correctly. Two orgs can independently have a template with the same slug, and built-in slugs are globally unique.

### 7. Template deletion restricted to org-scoped

**Decision**: `DELETE /api/templates/:id` only allows deleting templates where `organizationId` matches the user's active org. Built-in templates (`organizationId = NULL`) cannot be deleted via the API.

**Why**: Built-in templates are system data managed by seed scripts. Allowing deletion would create drift between instances and break the onboarding experience.

## Risks / Trade-offs

**[Risk] Large JSONB snapshots for complex pipelines** → Acceptable. Pipeline graphs are small (dozens of nodes at most). The `pipelineRuns` table already stores the same shape without issues.

**[Risk] Template slug collisions with pipeline slugs** → Not a concern. Templates and pipelines are in separate tables with separate namespaces. A template slug `ai-as-a-judge-scoring` and a pipeline slug `ai-as-a-judge-scoring` coexist fine.

**[Risk] Orphaned templates when org is deleted** → Mitigated by `ON DELETE CASCADE` on the `organizationId` FK. Built-in templates (null org) are unaffected.

**[Trade-off] No template editing** → Simpler model. Users who want to update a template delete the old one and save a new one. This is acceptable for the current scale and avoids versioning complexity.

## Migration Plan

1. Create `pipeline_template` table via Drizzle migration
2. Deploy `seedTemplates()` — populates built-in templates (idempotent, safe to run multiple times)
3. Deploy API routes and UI changes
4. Remove old `seedPipelines()` function and CLI script (can happen in a follow-up)

Rollback: Drop the `pipeline_template` table. No other tables are modified.
