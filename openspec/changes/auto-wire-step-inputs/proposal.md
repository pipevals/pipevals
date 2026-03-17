## Why

After connecting two nodes in the builder, users must manually type dot-path expressions like `steps.llm.text` into config fields — a friction-heavy, error-prone step that interrupts flow. Auto-wiring the target's primary input field on connect eliminates this manual step and makes building pipelines feel fast and intuitive.

## What Changes

- When a user draws an edge from source node A to target node B, `onConnect` automatically populates the target node's primary input field with a dot-path reference to the source's primary output (e.g. `steps.<sourceLabel>.text`).
- Each step type gets a declared **primary output key** (e.g. `ai_sdk` → `text`, `api_request` → `body`, `metric_capture` → `value`).
- Each step type gets a declared **primary input field** (e.g. `ai_sdk` → `promptTemplate`, `condition` → `expression`, `metric_capture` → `extractPath`, `transform` → adds a mapping entry).
- Auto-wire is non-destructive: only populates if the target field is empty or absent. Existing values are never overwritten.
- Trigger node as source uses `trigger.<firstSchemaKey>` (or `trigger` if schema is empty).
- Step types with unknown or code-defined outputs (`sandbox`) are skipped as source.
- Condition nodes are skipped as source (they branch rather than producing data).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `pipeline-builder-ui`: "Node connection" requirement gains an auto-wire scenario — on connect, the target node's primary config input is pre-filled with the source's output dot-path.

## Impact

- `lib/stores/pipeline-builder.ts` — `onConnect` calls new auto-wire logic
- `lib/pipeline/auto-wire.ts` (new) — pure function mapping `(sourceNode, targetNode, triggerSchema) → Partial<NodeConfig>`
- `openspec/specs/pipeline-builder-ui/` — delta spec adding the auto-wire scenario
