## Why

Adding a new step type currently requires touching three separate files: the handler, the two lookup tables in `auto-wire.ts` (`PRIMARY_OUTPUT` and `PRIMARY_INPUT_FIELD`), and a new `if` branch in the auto-wire function body. This scattered convention makes step types harder to add and the auto-wire logic brittle. Borrowing BPMN's Data Input/Output Association concept, each step type can declare its own input/output ports as co-located metadata, turning auto-wire into a generic algorithm driven by declarative data.

## What Changes

- Introduce a `StepPortDeclaration` type that describes each step type's input ports (which config fields accept upstream data) and output ports (which keys the step produces)
- Move port knowledge out of `auto-wire.ts` lookup tables and into each step type's registration in the step registry
- Rewrite `autoWireInputs` to be a generic function that reads port declarations instead of per-type `if` chains
- Update the pipeline builder UI to derive connection handle metadata from port declarations instead of hardcoded assumptions

## Capabilities

### New Capabilities
- `step-port-declarations`: The type system and registry extension for declaring input/output ports on step types — the core data model for this change

### Modified Capabilities
- `step-registry`: Registry gains a `ports` field per step type alongside the existing `handler` and config schema
- `pipeline-builder-ui`: Auto-wire logic switches from hardcoded tables to reading port declarations; handle rendering may use port metadata

## Impact

- `lib/pipeline/auto-wire.ts` — rewritten from per-type special cases to generic port-driven logic
- `lib/pipeline/steps/registry.ts` — expanded to include port declarations per step type
- `lib/pipeline/types.ts` — new `StepPortDeclaration` / `InputPort` / `OutputPort` types
- `lib/stores/pipeline-builder.ts` — `onConnect` may simplify since auto-wire becomes generic
- `lib/pipeline/__tests__/auto-wire.test.ts` — tests updated to match new API
- No database schema changes. No API changes. No breaking changes to pipeline execution.
