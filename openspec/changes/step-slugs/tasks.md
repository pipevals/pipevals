## 1. Slug Utility & Validation

- [x] 1.1 Add `stepSlugify(name: string): string` to `lib/slugify.ts` — lowercase, replace non-alphanumeric runs with `_`, trim leading/trailing `_`, return `""` for empty input
- [x] 1.2 Add `validateNodeSlugs(nodes: { id: string; slug: string | null }[]): string[]` to a new `lib/pipeline/validate-slugs.ts` — format check, uniqueness check, null passthrough
- [x] 1.3 Write tests for `stepSlugify` (simple label, spaces, special chars, empty, only special chars)
- [x] 1.4 Write tests for `validateNodeSlugs` (valid unique, duplicates, invalid format, empty string, null slugs, mixed)

## 2. Database Schema

- [ ] 2.1 Add nullable `slug` text column to `pipelineNodes` in `lib/db/pipeline-schema.ts`
- [ ] 2.2 Add partial unique index on `(pipelineId, slug)` where `slug IS NOT NULL`
- [ ] 2.3 Generate and run the Drizzle migration

## 3. API Layer

- [ ] 3.1 Update `PUT /api/pipelines/:id` to accept `slug` on each node in the request body
- [ ] 3.2 Call `validateNodeSlugs` in the PUT handler — return 400 with errors on failure
- [ ] 3.3 Persist `slug` when upserting nodes
- [ ] 3.4 Include `slug` in `GET /api/pipelines/:id` response (node objects)
- [ ] 3.5 Write API tests for slug validation (duplicate slugs → 400, invalid format → 400, null slugs → 200, valid slugs → 200)

## 4. Auto-wire & Input Resolver

- [ ] 4.1 Update `autoWireInputs` signature to accept `sourceSlug: string | null` instead of `sourceLabel`
- [ ] 4.2 Update `resolveSourceDotPath` to use `sourceSlug ?? sourceId` instead of `sourceLabel?.trim() ?? sourceId`
- [ ] 4.3 Update `input-resolver.ts` to key by `sourceNode.slug` instead of `sourceNode.label`
- [ ] 4.4 Update `WalkerNode` type in `graph-loader.ts` to include `slug` field
- [ ] 4.5 Update auto-wire tests to use slug parameter
- [ ] 4.6 Update input-resolver tests — verify keying by slug, verify null slug keys by ID only

## 5. Pipeline Builder Store & UI

- [ ] 5.1 Add `slug` to `PipelineNodeData` in the Zustand store
- [ ] 5.2 Add `updateNodeSlug(nodeId, slug)` action to the store
- [ ] 5.3 Auto-derive slug from label in `updateNodeLabel` — call `stepSlugify` and set slug when label changes
- [ ] 5.4 Pass `sourceSlug` instead of `sourceLabel` when calling `autoWireInputs` from the store's `onConnect`
- [ ] 5.5 Add slug input field to config panel below label — auto-derived, editable
- [ ] 5.6 Add dot-path hint below slug field (`"Reference as: steps.<slug>.<outputKey>"`) — only for node types with output ports
- [ ] 5.7 Add inline validation error on slug field when duplicate detected in current pipeline

## 6. Seed Templates

- [ ] 6.1 Add `slug` field to `SeedNode` interface in `seed-templates.ts`
- [ ] 6.2 Add explicit slugs to all seed nodes (trigger nodes get `null`, step nodes get slugified labels)
- [ ] 6.3 Update all dot-path references in seed configs to use slug-based paths (e.g. `steps.Generator.text` → `steps.generator.text`)
- [ ] 6.4 Update seed template tests to verify slug validity via `validateNodeSlugs`

## 7. Graph Snapshot & Run Compatibility

- [ ] 7.1 Ensure `graph_snapshot` in pipeline runs includes node slugs (update snapshot serialization if needed)
- [ ] 7.2 Verify walker's `loadGraph` populates `slug` on `WalkerNode` from snapshot data
