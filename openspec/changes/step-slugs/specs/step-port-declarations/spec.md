## MODIFIED Requirements

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
