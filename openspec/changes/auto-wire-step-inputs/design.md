## Context

The pipeline builder uses `onConnect` in `lib/stores/pipeline-builder.ts` to add edges via xyflow's `addEdge`. Currently it does nothing else — the target node's config is untouched. Users then manually type dot-path expressions like `steps.llm.text` into fields such as `promptTemplate`, `expression`, or `extractPath`.

Each step type has a predictable primary output (defined by its handler return shape) and a predictable primary input field (a single string or object key that consumes upstream data). The auto-wire mapping can therefore be expressed as two static lookup tables.

## Goals / Non-Goals

**Goals:**
- On every new connection, pre-fill the target node's primary empty input field with `steps.<sourceLabel>.<primaryOutputKey>` (or `trigger.<key>` for the trigger node).
- Keep the logic pure and testable: extract it into `lib/pipeline/auto-wire.ts`.
- Be non-destructive: never overwrite a field that already has a value.

**Non-Goals:**
- Auto-wiring multi-field configs (e.g. populating all mapping entries in `transform`).
- Inferring output shape from sandbox code.
- Modifying already-existing edges (only fires on new connections).
- UI affordance or toast — silent config mutation is sufficient.

## Decisions

**Decision 1: Static lookup tables over dynamic schema introspection**

Two maps define the wiring contract:
- `PRIMARY_OUTPUT: Record<StepType | "trigger", string>` — the top-level key the handler returns (e.g. `ai_sdk → "text"`, `api_request → "body"`, `metric_capture → "value"`).
- `PRIMARY_INPUT_FIELD: Record<StepType, string | null>` — which config key to populate on the target (e.g. `ai_sdk → "promptTemplate"`, `condition → "expression"`, `metric_capture → "extractPath"`, `transform → null` (special case), `sandbox → null` (skip)).

Alternative considered: derive output shape from TypeScript return types at runtime. Rejected — too complex and requires runtime introspection that doesn't exist.

**Decision 2: Transform gets a new mapping entry, not a field overwrite**

`TransformConfig.mapping` is a `Record<string, string>`. On connect, add a new entry with key `""` and value `steps.<label>.<output>`. This follows the same pattern as the "+ Add mapping" button in the UI — users can then name the key.

Alternative: set the first empty-valued entry. Rejected — harder to reason about and the mapping may have intentionally blank keys in progress.

**Decision 3: Only populate if field is empty/absent**

For string fields: populate if the current value is `""` or `undefined`.
For `transform.mapping`: always add the new entry (the mapping is additive by nature).

This preserves user intent for nodes that already have config.

**Decision 4: Trigger node uses the first schema key**

When source is the trigger node, the dot-path prefix is `trigger`. If the `triggerSchema` has at least one key, use `trigger.<firstKey>` as the reference. Otherwise use `trigger` as a bare prefix (user can extend it).

The `triggerSchema` is available in the store at connect time.

**Decision 5: Skip sandbox and condition as sources**

`sandbox` output shape is user-defined code — no static primary key. `condition` branches but produces no data. Both are skipped silently.

## Risks / Trade-offs

- [Wrong inference] The auto-wire picks `text` for `ai_sdk` but the node might be in `generateObject` mode (returning `object`). → Mitigation: the field is only set when empty; user can correct it with one edit. Document that auto-wire uses the default mode output.
- [Stale label] The source label changes after the edge is drawn; the dot-path in the target config still uses the old label. → Mitigation: this is a pre-existing issue with dot-path templates in general, not introduced by this change. Out of scope here.
- [Multiple inbound edges] A target node receives two auto-wire candidates. The second connection will not overwrite if the field was already populated by the first. → This is the desired behavior per Decision 3.

## Migration Plan

No database changes. No API changes. Client-side only.

1. Add `lib/pipeline/auto-wire.ts` with pure wiring logic and unit tests.
2. Call `autoWireInputs` inside `onConnect` in the store, immediately after `addEdge`.
3. Deploy — no rollback risk (existing pipelines unaffected; only new connections trigger the logic).
