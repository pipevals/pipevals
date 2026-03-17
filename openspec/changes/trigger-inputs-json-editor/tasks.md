## 1. Dependencies & Migration

- [x] 1.1 Install `@visual-json/react` and `@visual-json/core` via bun
- [x] 1.2 Edit `drizzle/0001_gifted_blue_shield.sql`: change `DEFAULT '[]'::jsonb` to `DEFAULT '{}'::jsonb`
- [x] 1.3 Update `lib/db/pipeline-schema.ts` default value for `triggerSchema` column to `{}` if hardcoded

## 2. Types & Utilities

- [x] 2.1 Remove `TriggerSchemaField` type and its import from `lib/pipeline/types.ts`
- [x] 2.2 Add `inferSchema(value: unknown): unknown` pure utility to `lib/pipeline/utils/infer-schema.ts` — recursively replaces leaf values with zero-value placeholders by type
- [x] 2.3 Write unit tests for `inferSchema`: flat object, nested object, array elements, null input

## 3. Store

- [ ] 3.1 Replace `triggerSchema: TriggerSchemaField[]` with `triggerSchema: Record<string, unknown>` in `lib/stores/pipeline-builder.ts`
- [ ] 3.2 Replace `addTriggerField`, `removeTriggerField`, `updateTriggerField`, `reorderTriggerFields` actions with a single `setTriggerSchema(schema: Record<string, unknown>)` action
- [ ] 3.3 Update `load` to default null `triggerSchema` to `{}` when initialising store state
- [ ] 3.4 Update `save` to include `triggerSchema` (already passes through; verify shape is correct)
- [ ] 3.5 Update store unit tests to use `setTriggerSchema` and `Record<string, unknown>` shape

## 4. API Layer

- [ ] 4.1 Update `GET /api/pipelines/:id` in `app/api/pipelines/[id]/route.ts`: default null `trigger_schema` to `{}` in the response
- [ ] 4.2 Update `PUT /api/pipelines/:id` Zod schema: change `triggerSchema` field from `TriggerSchemaField[]` to `z.record(z.string(), z.unknown())` (optional); add `.refine` to reject arrays
- [ ] 4.3 Update API unit tests: GET returns `triggerSchema: {}` for null DB values; PUT rejects array `triggerSchema`

## 5. Trigger Node

- [ ] 5.1 Update `components/pipeline/nodes/trigger-node.tsx`: derive output handles from `Object.keys(triggerSchema)` (top-level keys of the JSON object) instead of `triggerSchema.map(f => f.name)`
- [ ] 5.2 Update empty-state message: show when `Object.keys(triggerSchema).length === 0`

## 6. Trigger Inputs Panel

- [ ] 6.1 Rewrite `components/pipeline/trigger-inputs-panel.tsx`: replace `FieldRow` list and add-by-name input with `<JsonEditor value={triggerSchema} onChange={setTriggerSchema} />` from `@visual-json/react`
- [ ] 6.2 Add "Import from JSON" collapsible section: textarea for raw JSON input, Import button, inline error display on parse failure
- [ ] 6.3 Wire Import button to `inferSchema` + `setTriggerSchema`
- [ ] 6.4 Apply CSS custom property overrides to `JsonEditor` to match the pipevals design system (use `--vj-bg`, `--vj-text`, `--vj-border`, `--vj-accent`, `--vj-font` tokens mapped to Tailwind/shadcn CSS vars)
- [ ] 6.5 Wrap `JsonEditor` import in `dynamic()` with `ssr: false` to keep it out of the server bundle

## 7. Run Viewer Result Panel

- [ ] 7.1 Update `components/pipeline/result-panel.tsx` `TriggerPayloadPanel`: replace flat key-label iteration with a recursive JSON display that handles nested objects and arrays (can use `@visual-json/react` in `readOnly` mode or the existing `JsonBlock` component with full nesting)
- [ ] 7.2 Remove the `schema.find(f => f.name === key)?.description` label logic (descriptions are dropped)
