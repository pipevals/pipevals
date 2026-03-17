## Context

Pipelines currently enforce name uniqueness per organization via `uniqueIndex("pipeline_name_org_uidx")`. This ties identity to a mutable display label — preventing renames and conflating UX labels with system constraints. A slug provides a stable, URL-safe, human-readable identifier that can be the true uniqueness anchor while the name remains freely editable.

There is one existing migration (`0000_fair_toxin.sql`). The app is pre-production so merging schema changes into the baseline migration is safe and keeps the migration history clean.

## Goals / Non-Goals

**Goals:**
- Add `slug` column to `pipeline` table, unique per org
- Auto-generate slug from name on pipeline creation
- Handle slug collisions by appending an incrementing counter
- Remove name-based unique index
- Surface slug in all API responses
- Show live slug preview in the create pipeline form
- Merge schema changes into the existing `0000` migration

**Non-Goals:**
- Slug is not user-editable in this change (read-only derived field for now)
- Routing pipelines by slug instead of id (future change)
- Retroactive slug migration for existing data (no prod data to migrate)

## Decisions

### Slug generation format
**Decision**: Slugify with lowercase, alphanumeric and hyphens only, collapsing runs of special chars/spaces to single hyphens, stripping leading/trailing hyphens. Example: `"GPT-4o Eval!"` → `"gpt-4o-eval"`.

**Alternatives considered**: nanoid-style random suffix (e.g., `gpt-4o-eval-k3x9`) — rejected because deterministic slugs from names are more predictable and debuggable. Using the UUID id as slug — rejected because it loses human-readability entirely.

### Collision handling
**Decision**: On create, the server checks for existing slugs matching `slug` or `slug-{n}` pattern in the org and appends the next available counter (e.g., `gpt-4o-eval`, `gpt-4o-eval-2`, `gpt-4o-eval-3`). This is done server-side, not in the DB constraint, for readability.

**Alternatives considered**: Reject duplicate slugs with a 409 and ask user to choose — worse UX since names can legitimately repeat after the name constraint is removed.

### Slug generation location
**Decision**: Server-side only (in the POST /api/pipelines handler). The client sends only `name`; the server derives and persists the slug.

**Rationale**: Keeps slug logic in one place, avoids client/server divergence, and prevents the client from injecting arbitrary slugs.

### Slug in API response
**Decision**: Include `slug` in all pipeline response shapes (create, list, get). The schema is updated to include it as a required field.

### Migration merge strategy
**Decision**: Edit `drizzle/0000_fair_toxin.sql` directly to add the `slug` column and replace the name unique index with the slug unique index. Update `drizzle/meta/0000_snapshot.json` and `drizzle/meta/_journal.json` accordingly. Run `bun drizzle-kit generate` is not needed; manual edit is precise and avoids generating a spurious second migration.

**Rationale**: Single baseline migration is cleaner than a one-column additive migration that would live forever alongside the initial schema.

### Slug not user-editable
**Decision**: Slug is derived from name and not exposed as an editable field in this change. The UI shows it as a preview only.

**Rationale**: Editable slugs require rename/redirect logic and conflict resolution UX — out of scope here.

## Risks / Trade-offs

- **Collision query is not atomic** → Two simultaneous creates with the same name could race to claim the same slug. Mitigation: the DB unique index on `(slug, organization_id)` will reject the second insert with a constraint error, which the API can handle with a retry or 409.
- **Manual migration edit** → If `drizzle-kit` is run without awareness it will generate a new migration. Mitigation: document in tasks that `drizzle-kit generate` must not be run for this change; the manual edit is the migration.
- **Empty/special-char names produce empty slug** → e.g., `"!!!"` → `""`. Mitigation: fall back to a uuid-derived slug suffix when the slugified result is empty.

## Migration Plan

1. Edit `drizzle/0000_fair_toxin.sql`:
   - Add `"slug" text NOT NULL` to the `pipeline` table `CREATE TABLE` block (with a default for clarity in the SQL, even though there's no data)
   - Replace `CREATE UNIQUE INDEX "pipeline_name_org_uidx"` with `CREATE UNIQUE INDEX "pipeline_slug_org_uidx" ON "pipeline" USING btree ("slug","organization_id")`
2. Edit `drizzle/meta/0000_snapshot.json`:
   - Add `slug` column to the pipeline table columns map
   - Replace `pipeline_name_org_uidx` unique index entry with `pipeline_slug_org_uidx`
3. Update `lib/db/pipeline-schema.ts` to match
4. No rollback needed (pre-production; reset DB and re-migrate)

## Open Questions

- Should the slug eventually become the URL path for pipeline pages (e.g., `/pipelines/gpt-4o-eval` instead of `/pipelines/{uuid}`)? This would be a follow-up change.
