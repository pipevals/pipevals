## 1. Port type system

- [x] 1.1 Add `InputPort`, `OutputPort`, and `StepDefinition` types to `lib/pipeline/types.ts`
- [x] 1.2 Add unit tests verifying the type structure compiles correctly with sample declarations

## 2. Step registry migration

- [x] 2.1 Refactor `lib/pipeline/steps/registry.ts` from `Record<StepType, StepHandler>` to `Record<StepType, StepDefinition>`
- [x] 2.2 Add port declarations for `ai_sdk` (scalar input on `promptTemplate`, output `text`)
- [x] 2.3 Add port declarations for `api_request` (additive input on `bodyTemplate`, output `body`)
- [x] 2.4 Add port declarations for `sandbox` (template input on `code` with runtime-aware generator, empty outputs)
- [x] 2.5 Add port declarations for `condition` (scalar input on `expression` with ` != null` suffix, empty outputs)
- [x] 2.6 Add port declarations for `transform` (additive input on `mapping`, empty outputs)
- [x] 2.7 Add port declarations for `metric_capture` (additive input on `metrics`, empty outputs)

## 3. Generic auto-wire

- [x] 3.1 Rewrite `autoWireInputs` in `lib/pipeline/auto-wire.ts` to read port declarations from the registry instead of hardcoded tables — remove `PRIMARY_OUTPUT`, `PRIMARY_INPUT_FIELD`, and all per-type `if` branches
- [x] 3.2 Implement the three port modes: `scalar` (set if empty), `additive` (merge entry), `template` (call generate if empty)
- [x] 3.3 Handle trigger source via `triggerSchema` first-key lookup (replacing the existing `sourceType === "trigger"` branch)

## 4. Walker update

- [x] 4.1 Update `executeNode` in `lib/pipeline/walker/steps.ts` to access `registry[nodeType].handler` instead of `registry[nodeType]` directly

## 5. Tests

- [x] 5.1 Update `lib/pipeline/__tests__/auto-wire.test.ts` — all existing test cases must pass with identical assertions against the new generic implementation
- [x] 5.2 Add test: new step type with declared ports auto-wires correctly without any auto-wire.ts changes
- [x] 5.3 Update `lib/pipeline/__tests__/walker/input-resolver.test.ts` if the import of registry types changed
- [x] 5.4 Run full test suite (`bun test`) and verify zero regressions
