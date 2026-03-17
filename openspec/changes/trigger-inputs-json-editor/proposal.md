## Why

The trigger inputs panel introduced in `trigger-input-schema` uses a flat list of named fields (`TriggerSchemaField[]`) that requires users to add fields one by one and provides no way to express nested JSON structures — yet real pipeline payloads are arbitrary JSON objects. Replacing the flat model with a direct JSON editor lets users define their schema by simply writing (or pasting) the payload shape.

## What Changes

- **Replace `TriggerSchemaField[]` with a plain JSON object** as the trigger schema type. Instead of `[{ name, description }]`, the schema is a raw JSON object like `{ "prompt": "", "temperature": 0 }` where key names and value types define the contract.
- **Drop descriptions and custom type annotations** — the value of each key acts as a typed placeholder (string, number, boolean, object, array).
- **Replace the manual field-add UI** in `TriggerInputsPanel` with a `@visual-json/react` inline editor.
- **Add "Import from JSON" shortcut** — paste a sample payload and derive the schema from it (preserves key names and value types, replaces values with zero-value placeholders).
- **Update the migration** (`0001_gifted_blue_shield.sql`) to default the `trigger_schema` column to `'{}'::jsonb` instead of `'[]'::jsonb`. Migration has not been applied.
- **Update the run viewer** trigger panel to handle nested JSON display (currently assumes flat key-value pairs).
- **BREAKING**: `TriggerSchemaField` type and its associated store actions (`addTriggerField`, `removeTriggerField`, `updateTriggerField`, `reorderTriggerFields`) are removed.

## Capabilities

### New Capabilities

- `trigger-schema-json-editor`: JSON-object-based trigger schema editing in the pipeline builder, including import-from-sample functionality.

### Modified Capabilities

- `pipeline-builder-ui`: Trigger inputs panel replaces flat field list with a JSON editor; trigger node output handles derived from top-level keys of the JSON object.
- `pipeline-api`: `triggerSchema` field changes from `TriggerSchemaField[]` to `Record<string, unknown>` in GET/PUT responses.

## Impact

- **`lib/db/pipeline-schema.ts`**: No column change; JSONB stays. Default value updated in migration SQL.
- **`drizzle/0001_gifted_blue_shield.sql`**: Change default from `'[]'::jsonb` to `'{}'::jsonb`.
- **`lib/pipeline/types.ts`**: Remove `TriggerSchemaField`; trigger schema is now `Record<string, unknown>`.
- **`lib/stores/pipeline-builder.ts`**: Replace `triggerSchema: TriggerSchemaField[]` with `triggerSchema: Record<string, unknown>`; replace field-level actions with a single `setTriggerSchema` action.
- **`components/pipeline/trigger-inputs-panel.tsx`**: Full rewrite using `json-edit-react`.
- **`components/pipeline/nodes/trigger-node.tsx`**: Derive output handles from `Object.keys(triggerSchema)`.
- **`components/pipeline/result-panel.tsx`**: Update trigger payload display to handle nested JSON.
- **New dependencies**: `@visual-json/react` and `@visual-json/core` (npm).
- **Tests**: Update store and API unit tests to use new schema shape.
