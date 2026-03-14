## ADDED Requirements

### Requirement: Step handler interface

The system SHALL define a common handler interface for all step types. Each handler MUST accept a typed config object and a `StepInput` (the resolved upstream outputs) and return a `Promise<StepOutput>` (a JSON-serializable object). Handlers MUST be pure async functions with no shared mutable state.

#### Scenario: Handler receives resolved inputs

- **WHEN** a handler is invoked for a node with two upstream nodes (A and B)
- **THEN** the input object contains `{ steps: { [nodeAId]: outputA, [nodeBId]: outputB } }` plus the pipeline trigger payload

#### Scenario: Handler returns JSON-serializable output

- **WHEN** a handler completes execution
- **THEN** it returns a plain JSON object that can be stored in the step_results table and piped to downstream nodes

### Requirement: API request step

The system SHALL provide an `api_request` step type that makes an HTTP request. Config MUST include url, method, headers (optional), and body template (optional). The body template MUST support dot-path expressions referencing upstream outputs. The handler MUST return the response body parsed as JSON along with the HTTP status code.

#### Scenario: Successful API call

- **WHEN** an api_request step is configured with `POST https://api.example.com/check` and body `{ "text": "steps.nodeA.response" }`
- **THEN** the handler resolves the dot-path, sends the request, and returns `{ "status": 200, "body": { ... } }`

#### Scenario: API call failure

- **WHEN** an api_request step receives a non-2xx response
- **THEN** the handler throws an error with the status code and response body

### Requirement: AI SDK step

The system SHALL provide an `ai_sdk` step type that invokes an LLM via the AI SDK. Config MUST include provider, model, prompt template (with dot-path expressions), and optional parameters (temperature, maxTokens, responseFormat). The handler MUST return the generated text/object, token usage, and latency.

#### Scenario: Generate text

- **WHEN** an ai_sdk step is configured with provider "openai", model "gpt-4o", and a prompt template referencing upstream output
- **THEN** the handler resolves the template, calls generateText, and returns `{ "text": "...", "usage": { "promptTokens": N, "completionTokens": N }, "latencyMs": N }`

#### Scenario: Generate structured object

- **WHEN** an ai_sdk step config includes a responseFormat (JSON schema)
- **THEN** the handler calls generateObject and returns the parsed structured output

### Requirement: Sandbox step

The system SHALL provide a `sandbox` step type that executes user-defined code in an isolated sandbox environment. Config MUST include runtime (e.g., "node", "python"), code (string), and timeout (milliseconds). The handler MUST pass the resolved input as a global variable to the sandbox and return the sandbox's output.

#### Scenario: Execute scoring code

- **WHEN** a sandbox step is configured with Node.js runtime and code that computes a similarity score from the input
- **THEN** the handler runs the code in the sandbox with input available, and returns the code's output

#### Scenario: Sandbox timeout

- **WHEN** sandbox execution exceeds the configured timeout
- **THEN** the handler kills the sandbox and throws a timeout error

### Requirement: Condition step

The system SHALL provide a `condition` step type that evaluates a boolean expression against its input and selects an output branch. Config MUST include an expression string and a list of named handles. The handler MUST return `{ "branch": "<handle-name>" }` indicating which output handle is active. The expression MUST support dot-path references and basic comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`).

#### Scenario: Condition evaluates true

- **WHEN** a condition step has expression `steps.scorer.score > 0.6` and the input has `steps.scorer.score` = 0.85
- **THEN** the handler returns `{ "branch": "true" }`

#### Scenario: Condition evaluates false

- **WHEN** a condition step has expression `steps.scorer.score > 0.6` and the input has `steps.scorer.score` = 0.3
- **THEN** the handler returns `{ "branch": "false" }`

### Requirement: Transform step

The system SHALL provide a `transform` step type that reshapes data between steps. Config MUST include a mapping object where keys are output field names and values are dot-path expressions. The handler MUST resolve each expression and construct the output object.

#### Scenario: Extract and rename fields

- **WHEN** a transform step has mapping `{ "text": "steps.llm.text", "model": "steps.llm.model" }`
- **THEN** the handler extracts those paths from input and returns `{ "text": "...", "model": "..." }`

### Requirement: Metric capture step

The system SHALL provide a `metric_capture` step type that records evaluation metrics. Config MUST include metric_name and extract_path (dot-path to the value to record). The handler MUST resolve the extract_path from input and return `{ "metric": "<name>", "value": <resolved-value> }`. This is typically a terminal node in the graph.

#### Scenario: Capture accuracy metric

- **WHEN** a metric_capture step has metric_name "accuracy" and extract_path "steps.scorer.score"
- **THEN** the handler returns `{ "metric": "accuracy", "value": 0.85 }`

### Requirement: Step registry extensibility

The system SHALL organize step handlers as a registry (a typed record mapping step type strings to handler functions). Adding a new step type MUST only require: creating a handler function file, adding the type to the StepType enum, adding the config Zod schema, and registering the handler in the registry.

#### Scenario: Add a new step type

- **WHEN** a developer adds a new "webhook" step type
- **THEN** they create one handler file, add the type to the enum, define a config schema, and register it — no other files need modification

