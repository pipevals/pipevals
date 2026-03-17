## Context

The `trigger-input-schema` change shipped a flat `TriggerSchemaField[]` model: an ordered array of `{ name, description }` objects stored as JSONB. All implementation is live in the codebase. The migration (`0001_gifted_blue_shield.sql`) adds a `trigger_schema` JSONB column but has not yet been applied to any database.

The trigger node, store, and API all work around `TriggerSchemaField[]`. The problem: users must add fields one at a time by name, cannot express nesting, and cannot paste a sample payload to derive the schema. The UI primitives (`<input>` elements) feel disconnected from JSON — the actual wire format.

## Goals / Non-Goals

**Goals:**
- Replace `TriggerSchemaField[]` with `Record<string, unknown>` as the schema type end-to-end (store, API, DB default).
- Replace the field-list editor with a `json-edit-react` inline editor that lets users edit the JSON object directly.
- Add an "Import from JSON" flow: paste a sample payload → derive schema (zero-value placeholders by type).
- Derive trigger node output handles from `Object.keys(triggerSchema)` (top-level keys only).
- Update the migration default from `'[]'::jsonb` to `'{}'::jsonb`.
- Update result panel to handle nested trigger payload display.

**Non-Goals:**
- Type-checking or validating nested fields at runtime.
- Deriving output handles for nested keys (only top-level keys become handles).
- Adding descriptions or custom type annotations back.
- Changing the execution engine or template resolution (`trigger.*` paths still work as-is).

## Decisions

### 1. Schema is `Record<string, unknown>`, not a typed schema format
The stored object is a plain JSON "shape example" — keys are field names, values are typed placeholders (`""`, `0`, `false`, `[]`, `{}`). No explicit type field, no description field. Type is inferred from the value's JavaScript type.

*Alternative considered*: Keep `TriggerSchemaField[]` and add a `type` field. Rejected — the flat list doesn't express nesting, and a type annotation alongside a placeholder value is redundant. Letting the value itself carry the type is simpler and directly mirrors what the user will actually send.

### 2. `@visual-json/react` for the editor
`@visual-json/react` is a Vercel-published batteries-included JSON editor (tree sidebar + form view). The top-level `<JsonEditor value={schema} onChange={setTriggerSchema} />` is controlled, always-valid, and themeable via CSS custom properties that map cleanly to Tailwind/shadcn design tokens. It supports an optional `schema` prop for JSON Schema validation hints.

*Alternative considered*: `json-edit-react`. Rejected in favour of `@visual-json/react` — same editing capability but Vercel-maintained, more composable (VisualJson + TreeView + FormView), and CSS-variable theming matches the design system better.

*Alternative considered*: A `<textarea>` with JSON syntax highlight (CodeMirror/Monaco). Rejected — parses only on submit and gives poor inline feedback.

### 3. "Import from JSON" as a textarea modal / inline accordion
A collapsed "Import from sample JSON" section in the panel: user pastes raw JSON, clicks Import, the app runs `inferSchema(parsed)` to replace string values with `""`, numbers with `0`, booleans with `false`, arrays with `[""]`, objects recursively. This replaces the current editor content.

`inferSchema` is a small pure function — no library needed.

### 4. Trigger node handles from top-level keys only
`Object.keys(triggerSchema)` drives the output handle list. Nested keys are NOT exposed as handles — the template engine already resolves `trigger.config.model` via dot-path, so users can reference nested values manually without a handle.

### 5. Migration amendment — change default, not schema
`0001_gifted_blue_shield.sql` changes the default from `'[]'::jsonb` to `'{}'::jsonb`. The column type stays `jsonb`. Since the migration has never been applied, no data migration is needed and no additional migration file is created.

### 6. Store action simplification
Replace five granular actions (`addTriggerField`, `removeTriggerField`, `updateTriggerField`, `reorderTriggerFields`, plus implicit shape) with a single `setTriggerSchema(schema: Record<string, unknown>)`. `json-edit-react`'s `onUpdate` callback fires with the full new object, so the store only needs a setter.

## Risks / Trade-offs

- **Top-level-only handles lose fine-grained wiring** → Users who previously wired `trigger.prompt` directly via a handle can no longer do so for nested fields. Mitigation: manually typing `trigger.config.model` in a config field still works; this is an acceptable trade-off for simplicity.
- **`@visual-json/react` bundle size** → New dependency (~600KB unpacked / ~50KB gzipped). Acceptable for a builder-only panel (not on the critical render path). Split with `dynamic()` if needed.

## Migration Plan

1. Edit `drizzle/0001_gifted_blue_shield.sql`: change `DEFAULT '[]'::jsonb` → `DEFAULT '{}'::jsonb`.
2. Update `lib/db/pipeline-schema.ts` default if hardcoded.
3. Update all TypeScript types, store, and API in one PR.
4. Apply migration — no data to migrate, no coercion shim needed.
5. Rollback: column is still nullable JSONB — reverting code changes is safe.

## Open Questions

- Should the Import accordion be always visible or only when `triggerSchema` is empty? (Lean: always visible, collapsed by default.)
- Should `json-edit-react` allow adding root-level array values, or only objects? (Lean: restrict root to object only via `restrictAdd` or similar prop.)
