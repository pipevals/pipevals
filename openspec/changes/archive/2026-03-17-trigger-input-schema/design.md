## Context

The pipeline execution engine passes `triggerPayload` to every step as a `trigger.*` dot-path namespace. Template references like `trigger.prompt` work at runtime, but users authoring pipelines in the builder have no way to know what fields are available on the trigger — there is no schema, no visual representation, and no autocomplete. The trigger is functionally invisible during authoring.

The execution model is important to understand: the trigger is **not a node** in the execution graph — it is ambient context passed to every step. Any node can reference `trigger.*` regardless of graph topology. This design preserves that model while adding a design-time representation.

## Goals / Non-Goals

**Goals:**
- Let pipeline authors define a named list of trigger input fields (the trigger schema) per pipeline.
- Render a locked "Trigger" node on the canvas whose output handles map to schema fields.
- Drawing an edge from a trigger handle to a step input auto-inserts the `trigger.fieldName` template reference into the target field.
- Surface the trigger schema in the "Trigger with payload" dialog so it pre-fills the right keys.
- Store the schema in the database alongside the pipeline; include it in the API.

**Non-Goals:**
- Type-checking trigger fields (string/number/boolean) — the engine already accepts arbitrary JSON.
- Validating that referenced `trigger.*` paths exist at run time — the existing dot-path resolver handles missing paths gracefully.
- Removing or changing the ability to manually type `trigger.*` references in config fields.
- Changing the execution engine or graph snapshot format.

## Decisions

### 1. Trigger schema stored as JSONB on the pipeline row
Add a nullable `trigger_schema` JSONB column to the `pipelines` table. Schema: `Array<{ name: string; description?: string }>`. This is the simplest approach — no new table, no foreign keys, and the schema can evolve without migrations.

*Alternative considered*: Separate `pipeline_trigger_fields` table. Rejected because the ordered list of fields is inherently pipeline-scoped metadata, and a JSONB column keeps reads/writes co-located with the pipeline row.

### 2. Trigger node is a virtual UI-only node
The trigger node exists in the xyflow canvas state and is persisted as part of the pipeline's node list (so its position is saved). However, it has a reserved type `"trigger"` and is **excluded from the graph snapshot** at run time — the execution engine doesn't process it as a step. This avoids execution changes and keeps the walker clean.

*Alternative considered*: Don't persist the trigger node position at all; always render it at a fixed position. Rejected because users need to be able to lay out their canvas freely, including where the trigger node sits.

### 3. Edge from trigger handle → step input writes a template string
When a user draws an edge from a trigger node's output handle (labeled with the field name) to a step node's input handle, the pipeline builder store:
1. Records the edge (for visual display only).
2. Writes `trigger.{fieldName}` into the target step's corresponding config field.

Edges from the trigger node are treated as "wiring annotations" — they inform the config but the execution engine reads the template string in the config, not the edge. The trigger node is excluded from the graph snapshot.

*Alternative considered*: Have the execution engine actually traverse trigger→step edges. Rejected because it breaks the existing ambient-context model and would require execution changes.

### 4. Trigger schema panel in the builder sidebar
The existing sidebar (node palette + config panel) gains a third state: "Trigger Inputs" shown when no node is selected or when the trigger node is selected. The panel lists current fields and provides add/remove/reorder controls. Changes update the pipeline builder store immediately and are persisted on save.

### 5. One trigger node per pipeline, auto-created
When a pipeline is loaded in the builder, if no trigger node exists in the stored nodes, one is auto-created at a default position (top-left). It cannot be deleted (delete key is suppressed for this node type). Its handles are dynamically derived from the current trigger schema.

## Risks / Trade-offs

- **Trigger edges vs config fields can diverge** → If a user manually removes a `trigger.*` string from a config field, the corresponding edge in the canvas becomes stale (visual artifact). Mitigation: on save, prune trigger edges whose target config field no longer contains the expected template string. This is a best-effort cleanup.
- **Migration adds a nullable column** → Safe; existing pipelines have `trigger_schema = null`, treated as an empty array.
- **Trigger node excluded from snapshot** → Could confuse users who see a "Trigger" node on the canvas but not in run viewer. Mitigation: the run viewer already shows trigger payload via the step input JSON; the trigger node is just an authoring aid.

## Migration Plan

1. Add `trigger_schema JSONB` column to `pipelines` (nullable). No data migration needed.
2. Update `GET /api/pipelines/:id` to include `triggerSchema` (default `[]` for null).
3. Update `PUT /api/pipelines/:id` to persist `triggerSchema`.
4. Deploy builder UI changes; existing pipelines get an auto-created trigger node with empty schema.

Rollback: column is nullable; removing UI changes reverts gracefully without breaking existing data.

## Open Questions

- Should trigger node handles show only explicitly defined schema fields, or also show a generic "payload" handle that maps to the full `trigger` object? (Lean toward schema-only for now; add generic handle later if needed.)
- Should edges from trigger handles be persisted in the `pipeline_edges` table or stored separately? (Lean toward persisting in `pipeline_edges` with a source node id matching the trigger node, excluded from graph snapshot by node type check.)
