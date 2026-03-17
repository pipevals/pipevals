## 1. Database & Schema

- [x] 1.1 Add `trigger_schema` nullable JSONB column to the `pipelines` table in `lib/db/pipeline-schema.ts`
- [x] 1.2 Write and run a Drizzle migration for the new column
- [x] 1.3 Add `TriggerSchemaField` TypeScript type (`{ name: string; description?: string }`) to `lib/pipeline/types.ts`

## 2. API Layer

- [x] 2.1 Update `GET /api/pipelines/:id` to include `triggerSchema` in the response (default `[]` for null)
- [x] 2.2 Update `PUT /api/pipelines/:id` Zod schema to accept optional `triggerSchema` array and persist it to the DB
- [x] 2.3 Update graph snapshot logic to exclude nodes of type `"trigger"` and their edges from the snapshot used during execution
- [x] 2.4 Update DAG validation to skip trigger-type nodes and trigger edges

## 3. Pipeline Builder Store

- [x] 3.1 Add `triggerSchema: TriggerSchemaField[]` to the pipeline builder Zustand store state in `lib/stores/pipeline-builder.ts`
- [x] 3.2 Add store actions: `addTriggerField`, `removeTriggerField`, `updateTriggerField`, `reorderTriggerFields`
- [x] 3.3 On pipeline load, initialise `triggerSchema` from the API response; auto-create a trigger node if none exists in the loaded nodes
- [x] 3.4 On save, include `triggerSchema` in the PUT request body alongside nodes and edges
- [x] 3.5 Suppress delete for nodes with type `"trigger"` in the xyflow `onNodesDelete` handler

## 4. Trigger Node Component

- [x] 4.1 Create `components/pipeline/nodes/trigger-node.tsx` — a visually distinct node with no input handle and dynamic output handles derived from the trigger schema
- [x] 4.2 Register the `"trigger"` node type in the xyflow `nodeTypes` map
- [x] 4.3 Render a placeholder state on the trigger node when `triggerSchema` is empty
- [x] 4.4 Implement the edge-creation handler: when an edge is drawn from a trigger handle to a step's input handle, write `trigger.{fieldName}` into the corresponding step config field in the store

## 5. Trigger Inputs Panel

- [x] 5.1 Create `components/pipeline/trigger-inputs-panel.tsx` with add/remove/edit controls for trigger schema fields
- [x] 5.2 Show the trigger inputs panel in the builder sidebar when no node is selected or when the trigger node is selected (replace/augment the current empty-selection state)
- [x] 5.3 Wire panel actions to the store's `addTriggerField`, `removeTriggerField`, `updateTriggerField` actions

## 6. Trigger Payload Run Viewer

- [ ] 6.1 Add a "Trigger" panel to the run viewer that displays the received `triggerPayload` as a labeled key-value list, using `triggerSchema` field names as labels where available and falling back to raw keys
- [ ] 6.2 Show the trigger panel above the step list so it is visible without selecting a node

## 7. Tests

- [ ] 7.1 Unit test: `GET /api/pipelines/:id` returns `triggerSchema` field (defaulting to `[]`)
- [ ] 7.2 Unit test: `PUT /api/pipelines/:id` persists `triggerSchema`; omitting the field preserves existing schema
- [ ] 7.3 Unit test: graph snapshot excludes trigger node and trigger edges
- [ ] 7.4 Unit test: store `addTriggerField` / `removeTriggerField` update schema and trigger node handles
- [ ] 7.5 Unit test: edge from trigger handle writes correct `trigger.{fieldName}` into target step config
- [ ] 7.6 Unit test: trigger node cannot be deleted (delete action is a no-op)
