## ADDED Requirements

### Requirement: Input port declaration

The system SHALL define an `InputPort` type with a `configField` (the config key this port writes to) and a `mode` enum of `scalar`, `additive`, or `template`. A `scalar` port MUST set the config field to a dot-path value only when the field is currently empty or undefined. An `additive` port MUST merge a new `{ "": dotPath }` entry into the config field's object value, regardless of existing entries. A `template` port MUST accept a `generate` function `(dotPath: string, config: Record<string, unknown>) => string` that produces the config field value, and MUST only set the field when it is currently empty or undefined.

#### Scenario: Scalar port skips non-empty field

- **WHEN** a scalar input port targets config field `promptTemplate` and the field already contains `"steps.prev.text"`
- **THEN** the port produces no patch (the existing value is preserved)

#### Scenario: Scalar port populates empty field

- **WHEN** a scalar input port targets config field `promptTemplate` and the field is `""` or `undefined`
- **THEN** the port produces a patch setting `promptTemplate` to the source dot-path

#### Scenario: Additive port always adds entry

- **WHEN** an additive input port targets config field `metrics` and it already contains `{ "accuracy": "steps.scorer.score" }`
- **THEN** the port produces a patch merging `{ "": dotPath }` into the existing object

#### Scenario: Template port generates value

- **WHEN** a template input port targets config field `code` with a generate function, and the field is empty
- **THEN** the port produces a patch setting `code` to the return value of `generate(dotPath, config)`

#### Scenario: Template port skips non-empty field

- **WHEN** a template input port targets config field `code` and the field already contains code
- **THEN** the port produces no patch

### Requirement: Output port declaration
The system SHALL define an `OutputPort` type with a `key` field (the output object key that downstream steps reference via dot-paths). A step type with an empty outputs array MUST be skipped as an auto-wire source. The output port's `key` is used to construct the dot-path: `steps.<sourceSlug>.<key>`, where `sourceSlug` is the node's slug field (falling back to node ID when slug is null).

#### Scenario: Step type with declared output
- **WHEN** an `ai_sdk` step with slug `"llm"` has output port `{ key: "text" }` and is connected to a downstream node
- **THEN** the auto-wire system constructs the dot-path `steps.llm.text`

#### Scenario: Step type with no outputs
- **WHEN** a `sandbox` step type has an empty outputs array and is connected to a downstream node
- **THEN** the auto-wire system skips this source and produces no patch

#### Scenario: Source with label containing spaces uses slug
- **WHEN** a step with label `"Model A"` and slug `"model_a"` has output port `{ key: "text" }` and is connected to a downstream node
- **THEN** the auto-wire system constructs the dot-path `steps.model_a.text` (not `steps.Model A.text`)

### Requirement: Step definition type

The system SHALL define a `StepDefinition` type that combines a `handler` (the existing `StepHandler` function) with a `ports` object containing `inputs` (array of `InputPort`) and `outputs` (array of `OutputPort`). The step registry MUST map each `StepType` to a `StepDefinition` instead of a bare `StepHandler`.

#### Scenario: Registry entry structure

- **WHEN** the `ai_sdk` entry is looked up in the registry
- **THEN** it returns a `StepDefinition` with a `handler` function and `ports` containing one input port (`promptTemplate`, scalar) and one output port (`text`)

#### Scenario: Walker accesses handler from definition

- **WHEN** the walker executes a node and looks up its step type in the registry
- **THEN** it accesses `registry[nodeType].handler` to get the handler function

### Requirement: Trigger source port resolution

The system SHALL support a `trigger` source type in the port system. When the source type is `trigger`, the output dot-path MUST be `trigger.<firstSchemaKey>` where `firstSchemaKey` is the first key of the pipeline's `triggerSchema` object. If the trigger schema is empty, the dot-path MUST be `trigger`.

#### Scenario: Trigger with schema key

- **WHEN** the trigger node is the source, and the pipeline's triggerSchema is `{ "prompt": "", "context": "" }`
- **THEN** the auto-wire system uses `trigger.prompt` as the source dot-path

#### Scenario: Trigger with empty schema

- **WHEN** the trigger node is the source, and the pipeline's triggerSchema is `{}`
- **THEN** the auto-wire system uses `trigger` as the source dot-path
