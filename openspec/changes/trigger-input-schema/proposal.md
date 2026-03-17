## Why

The pipeline execution engine already passes `triggerPayload` to every step as a `trigger.*` context object, but the pipeline builder UI offers no way to define or discover what fields the trigger exposes — users must blindly type `trigger.fieldName` into config fields with no guidance, validation, or visual representation of the trigger as a data source. This creates a broken authoring experience: the capability exists at runtime but is invisible at design time.

## What Changes

- Add a **trigger input schema** to each pipeline: an ordered list of named fields (name + optional description), stored as part of the pipeline definition.
- Surface a **"Trigger Inputs" panel** in the pipeline builder sidebar that lets users define and edit the schema (add/remove/reorder fields).
- Render a **trigger node** on the pipeline canvas as a locked, non-deletable source node that visually represents the trigger payload and connects to downstream steps.
- The trigger node's output handles are derived from the schema fields, letting users draw edges from `trigger.fieldName` to step input slots (generating the correct `trigger.fieldName` template reference automatically).
- The **"Trigger with payload" dialog** (from the `trigger-run-with-payload` change) uses the schema to pre-populate the JSON payload with the expected keys.

## Capabilities

### New Capabilities

- `pipeline-trigger-schema`: Define, store, and render a named field schema for the trigger input of a pipeline.
- `trigger-node`: A special canvas node representing the trigger payload source, with per-field output handles that auto-wire template references into downstream step config.

### Modified Capabilities

- `pipeline-api`: The pipeline `GET` and `PUT` endpoints must read/write the trigger schema (a new `triggerSchema` field on the pipeline object).
- `pipeline-builder-ui`: The builder gains the trigger node and trigger schema panel; edge connections from trigger handles generate template strings in step config.

## Impact

- **Database**: New `trigger_schema` JSONB column on the `pipelines` table (nullable, defaults to empty array). Migration required.
- **API**: `GET /api/pipelines/:id` and `PUT /api/pipelines/:id` include `triggerSchema` in the response/request body.
- **Pipeline builder store** (`lib/stores/pipeline-builder.ts`): Extended to hold the trigger schema and manage the locked trigger node.
- **Config panel** (`components/pipeline/config-panel.tsx`): May display `trigger.`* field suggestions derived from the schema.
- **Graph model**: The trigger node is a virtual node — it exists in the UI but is excluded from the graph snapshot used during execution (the execution engine reads the payload directly from `pipelineRuns.trigger_payload`).
- **No execution changes**: The walker and step handlers are unchanged; `trigger.`* template resolution already works.

