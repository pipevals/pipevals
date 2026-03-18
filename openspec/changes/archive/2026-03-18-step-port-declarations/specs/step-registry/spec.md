## MODIFIED Requirements

### Requirement: Step registry extensibility

The system SHALL organize step types as a registry (a typed record mapping step type strings to `StepDefinition` objects). Each `StepDefinition` MUST include a `handler` function and a `ports` declaration (input and output ports). Adding a new step type MUST only require: creating a handler function file with its port declarations, adding the type to the StepType enum, adding the config Zod schema, and registering the `StepDefinition` in the registry — no other files need modification. In particular, adding a step type MUST NOT require editing auto-wire logic.

#### Scenario: Add a new step type

- **WHEN** a developer adds a new "webhook" step type
- **THEN** they create one file containing the handler function and port declarations, add the type to the enum, define a config schema, and register the StepDefinition — no other files need modification

#### Scenario: New step type auto-wires without touching auto-wire.ts

- **WHEN** a developer registers a new step type with output port `{ key: "result" }` and a downstream step has a scalar input port on `dataField`
- **THEN** connecting them in the builder auto-wires `steps.<label>.result` into `dataField` with no changes to auto-wire.ts
