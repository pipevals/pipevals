## 1. Database Schema

- [ ] 1.1 Add `slug` column (`text().notNull()`) to the `pipelines` table in `lib/db/pipeline-schema.ts`
- [ ] 1.2 Replace `uniqueIndex("pipeline_name_org_uidx").on(table.name, table.organizationId)` with `uniqueIndex("pipeline_slug_org_uidx").on(table.slug, table.organizationId)` in `lib/db/pipeline-schema.ts`

## 2. Migration Merge

- [ ] 2.1 Edit `drizzle/0000_fair_toxin.sql`: add `"slug" text NOT NULL` to the `pipeline` CREATE TABLE block
- [ ] 2.2 Edit `drizzle/0000_fair_toxin.sql`: replace `CREATE UNIQUE INDEX "pipeline_name_org_uidx" ON "pipeline" USING btree ("name","organization_id")` with `CREATE UNIQUE INDEX "pipeline_slug_org_uidx" ON "pipeline" USING btree ("slug","organization_id")`
- [ ] 2.3 Update `drizzle/meta/0000_snapshot.json`: add `slug` column entry to the pipeline table and replace the `pipeline_name_org_uidx` unique index with `pipeline_slug_org_uidx`

## 3. Slug Utility

- [ ] 3.1 Create `lib/utils/slugify.ts` with a `slugify(name: string): string` function that lowercases, replaces non-alphanumeric runs with hyphens, strips leading/trailing hyphens, and falls back to a UUID segment for empty results

## 4. API — Create Pipeline

- [ ] 4.1 In `app/api/pipelines/route.ts` POST handler: after trimming the name, call `slugify(name)` to produce `baseSlug`
- [ ] 4.2 Query the org's existing slugs to find collisions (`LIKE '{baseSlug}' OR LIKE '{baseSlug}-%'`), then compute the next available slug (e.g., `"eval"` → `"eval-2"` → `"eval-3"`)
- [ ] 4.3 Remove the existing duplicate-name check (the unique index on slug replaces this concern)
- [ ] 4.4 Include `slug` in the insert payload and in the 201 response body

## 5. API — Get & List Pipeline Responses

- [ ] 5.1 In `app/api/pipelines/route.ts` GET handler: ensure `slug` is selected and included in the list response
- [ ] 5.2 In `app/api/pipelines/[id]/route.ts` GET handler: ensure `slug` is selected and included in the single-pipeline response

## 6. UI — Slug Preview

- [ ] 6.1 In `components/pipeline/pipeline-list.tsx`: import `slugify` from `lib/utils/slugify`
- [ ] 6.2 Add a read-only slug preview element below the name input that renders `Slug: {slugify(name)}` when `name` is non-empty, using muted/secondary text styling
