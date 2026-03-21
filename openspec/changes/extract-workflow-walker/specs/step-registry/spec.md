## MODIFIED Requirements

### Requirement: Step handler interface

The system SHALL use the `StepHandler` type from the `@pipevals/workflow-walker` package: `(config: Record<string, unknown>, input: StepInput) => Promise<StepOutput>`. The `StepInput` and `StepOutput` types SHALL also be imported from the package.

Pipevals' existing handlers SHALL conform to this interface without modification, as they already match the signature.

#### Scenario: Handler receives resolved inputs

- **WHEN** a handler is invoked for a node with two upstream nodes (A and B)
- **THEN** the input object contains `{ steps: { [nodeAId]: outputA, [nodeBId]: outputB } }` plus the pipeline trigger payload

#### Scenario: Handler returns JSON-serializable output

- **WHEN** a handler completes execution
- **THEN** it returns a plain JSON object compatible with the package's `StepOutput` type

### Requirement: Step registry extensibility

The system SHALL construct a `StepRegistry` (a `Record<string, { handler: StepHandler }>`) at the application level and pass it to `createWalker()`. Adding a new step type SHALL only require: creating a handler function, and adding it to the registry object — the walker package does not need modification.

The pipevals-specific `StepDefinition` type (which includes `ports`) SHALL remain in pipevals for builder UI purposes. The walker package's `StepRegistry` only requires the `handler` field.

#### Scenario: Add a new step type

- **WHEN** a developer adds a new "webhook" step type to pipevals
- **THEN** they create the handler function, add it to the registry passed to `createWalker()`, and add port declarations to pipevals' local port registry — the walker package is unmodified

#### Scenario: Consumer in another project registers custom steps

- **WHEN** another project needs only `condition`, `transform`, and a custom `validator` step
- **THEN** they construct a registry with three entries and pass it to `createWalker()` — no unused handler code is loaded
