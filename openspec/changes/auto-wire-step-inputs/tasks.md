## 1. Auto-Wire Logic

- [x] 1.1 Create `lib/pipeline/auto-wire.ts` with `PRIMARY_OUTPUT` lookup table mapping each `StepType` (and `"trigger"`) to its primary output key string
- [x] 1.2 Add `PRIMARY_INPUT_FIELD` lookup table mapping each `StepType` to the config field name that should be auto-populated (null for sandbox and condition)
- [x] 1.3 Implement `autoWireInputs(sourceNode, targetNode, triggerSchema)` — returns a partial config patch or null if nothing to wire
- [x] 1.4 Handle trigger node source: use `trigger.<firstSchemaKey>` when `triggerSchema` has keys, else bare `trigger`
- [x] 1.5 Handle transform target as special case: add a new mapping entry `{ "": "steps.<label>.<output>" }` to `mapping` object
- [x] 1.6 Ensure all string fields only populate when currently `""` or `undefined`

## 2. Store Integration

- [ ] 2.1 In `lib/stores/pipeline-builder.ts`, import `autoWireInputs` from the new module
- [ ] 2.2 Inside `onConnect`, after calling `addEdge`, look up source and target nodes from current state
- [ ] 2.3 Call `autoWireInputs` with the resolved nodes and current `triggerSchema`
- [ ] 2.4 If a patch is returned, call `updateNodeConfig` for the target node with the merged config

## 3. Tests

- [ ] 3.1 Write unit tests for `autoWireInputs` covering: ai_sdk → ai_sdk, ai_sdk → metric_capture, api_request → condition, ai_sdk → transform, trigger → ai_sdk
- [ ] 3.2 Test non-overwrite behavior: existing non-empty field is preserved
- [ ] 3.3 Test skip cases: sandbox source returns null, condition source returns null
- [ ] 3.4 Test trigger source with empty schema (no firstKey) returns bare `trigger` prefix
