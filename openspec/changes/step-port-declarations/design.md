## Context

The pipeline builder uses a custom graph model where step types (api_request, ai_sdk, sandbox, condition, transform, metric_capture) are connected via edges. When a user draws an edge, `autoWireInputs()` auto-populates the target node's config based on the source type's primary output.

Currently, the knowledge of "what does each step produce?" and "which config field should receive upstream data?" lives in two hardcoded lookup tables (`PRIMARY_OUTPUT`, `PRIMARY_INPUT_FIELD`) in `auto-wire.ts`, plus 112 lines of per-type branching. The step registry (`steps/registry.ts`) only maps step types to handler functions — it has no metadata about data shape.

This means adding a new step type requires touching auto-wire.ts (two tables + new if-branch), which violates the step-registry spec's promise that adding a step type should not require modifying other files.

## Goals / Non-Goals

**Goals:**
- Each step type declares its input/output ports as co-located metadata in the registry
- `autoWireInputs` becomes a generic function that reads port declarations — no per-type branches
- Adding a new step type is fully self-contained: handler + config schema + port declaration
- Existing auto-wire behavior is preserved exactly (no user-visible changes)

**Non-Goals:**
- Rendering typed connection handles in the UI (future enhancement — ports enable this but we don't implement it now)
- Changing the walker's input resolution logic (it already works generically via dot-paths)
- Adding new step types as part of this change
- Modifying the database schema or API

## Decisions

### 1. Port declaration shape: co-located with handler in registry

Each step type entry in the registry gains a `ports` field alongside its `handler`:

```ts
interface InputPort {
  /** The config field this port writes to */
  configField: string;
  /** How the port accepts values */
  mode: "scalar" | "additive" | "template";
}

interface OutputPort {
  /** The output key that downstream steps reference */
  key: string;
}

interface StepDefinition {
  handler: StepHandler<any>;
  ports: {
    inputs: InputPort[];
    outputs: OutputPort[];  // empty = not auto-wireable as source
  };
}
```

**Why this over a separate ports file or decorator pattern:** Co-location means you see handler + ports + config schema in one place per step type. No indirection, no registration ceremony. The registry becomes the single source of truth.

**Alternatives considered:**
- **Decorator/annotation pattern**: More ceremony, harder to type in TS without experimental decorators
- **Separate `ports.ts` file per step**: Splits knowledge across files, same problem as today but in reverse

### 2. Port modes capture the three wiring patterns

Today's auto-wire has three distinct behaviors scattered across if-branches:

| Current pattern | Port mode | Behavior |
|---|---|---|
| `promptTemplate`, `expression`, `code` — set if empty | `scalar` | Set config field to dot-path if field is currently empty/undefined |
| `bodyTemplate`, `mapping`, `metrics` — always add entry | `additive` | Merge `{ "": dotPath }` into the config field's object (always additive) |
| `code` with runtime-aware template | `template` | Generate a code string using a template function, set if empty |

**Why three modes instead of a generic function per port:** The `scalar` and `additive` modes cover 5 of 6 step types without any custom logic. Only sandbox's code generation needs the `template` mode with a custom function. This keeps 83% of cases purely declarative.

### 3. Trigger source handled via a special "trigger" entry

The trigger node is not a real step type but needs to participate in auto-wire as a source. The port system includes a `trigger` entry with outputs derived from the trigger schema at wire-time (the first key of `triggerSchema`). This replaces the existing `sourceType === "trigger"` special case in auto-wire.

**Why not a separate mechanism:** The trigger already appears in the `PRIMARY_OUTPUT` table today. Modeling it as a port entry keeps the auto-wire algorithm uniform.

### 4. Auto-wire algorithm becomes a three-step generic function

```
1. Look up source type's output ports → get primary output key → build dot-path
2. Look up target type's input ports → get first matching port
3. Apply port mode (scalar: set if empty, additive: merge entry, template: generate)
```

No `if (targetType === "...")` branches. The function signature stays the same for backwards compatibility with the builder store's `onConnect`.

## Risks / Trade-offs

**[Risk] Port declarations could drift from actual handler behavior** → Mitigation: Port declarations live in the same file as the handler. Tests validate that declared output keys match what the handler actually returns. The config schema already validates input fields.

**[Risk] Template mode adds a function to what's otherwise declarative data** → Mitigation: Only one step type (sandbox) uses it. The template function is a simple `(dotPath, config) => string` — minimal API surface. If more step types need custom wiring logic, this pattern scales.

**[Trade-off] Registry type becomes more complex** → The registry goes from `Record<StepType, StepHandler>` to `Record<StepType, StepDefinition>`. This is a one-time cost that pays for itself by eliminating the auto-wire lookup tables and if-chains. All existing registry consumers (the walker's `executeNode`) just access `.handler` instead of the function directly.
