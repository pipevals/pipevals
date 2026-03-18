## MODIFIED Requirements

### Requirement: Node connection

The system SHALL allow users to draw edges between nodes by dragging from an output handle to an input handle. Condition nodes MUST display labeled output handles (e.g., "true"/"false" or custom labels). The system MUST prevent connections that would create a cycle. Condition node output handle arrays MUST be memoized to prevent unnecessary re-renders during canvas interactions. Upon creating a new connection, the system MUST automatically populate the target node's config by reading the source step type's output port declarations and the target step type's input port declarations from the step registry. The auto-wire algorithm MUST:

1. Look up the source type's output ports. If the outputs array is empty, skip auto-wire entirely.
2. Use the first output port's key to construct the dot-path (`steps.<sourceLabel>.<key>` or `trigger.<firstSchemaKey>`).
3. Look up the target type's input ports. Use the first input port.
4. Apply the port's mode: `scalar` sets the config field if empty, `additive` merges a new entry, `template` calls the generate function if empty.

This auto-wire MUST NOT overwrite existing non-empty string fields (for scalar and template modes). The resulting behavior MUST be identical to the current per-type auto-wire rules.

#### Scenario: Draw an edge between two nodes

- **WHEN** a user drags from node A's output handle to node B's input handle
- **THEN** an edge is created connecting A to B

#### Scenario: Prevent cycle creation

- **WHEN** a user attempts to draw an edge that would create a cycle
- **THEN** the connection is rejected and the edge is not created

#### Scenario: Condition node handles

- **WHEN** a condition node is on the canvas
- **THEN** it displays distinct output handles labeled with the branch names (e.g., "true", "false")

#### Scenario: Auto-wire ai_sdk target from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to another ai_sdk node whose promptTemplate is empty
- **THEN** the target node's promptTemplate is set to `steps.llm.text` (derived from ai_sdk's output port key "text" and ai_sdk's scalar input port on "promptTemplate")

#### Scenario: Auto-wire api_request body from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to an api_request node
- **THEN** a new bodyTemplate entry with value `steps.llm.text` and an empty key is added (derived from api_request's additive input port on "bodyTemplate")

#### Scenario: Auto-wire sandbox code from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "llm" to a sandbox node whose code is empty
- **THEN** the sandbox node's code is set to a starter template that reads `input["steps"]["llm"]["text"]` (derived from sandbox's template input port on "code")

#### Scenario: Auto-wire sandbox code does not overwrite existing code

- **WHEN** a user connects any source node to a sandbox node whose code already contains content
- **THEN** the existing code is preserved and no auto-wire mutation occurs (template mode skips non-empty fields)

#### Scenario: Auto-wire condition expression from api_request source

- **WHEN** a user connects an api_request node with label "fetch" to a condition node whose expression is empty
- **THEN** the target node's expression is set to `steps.fetch.body != null` (derived from condition's scalar input port on "expression", with the ` != null` suffix applied by the port's value transform)

#### Scenario: Auto-wire transform mapping from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "gen" to a transform node
- **THEN** a new mapping entry with value `steps.gen.text` and an empty key is added (derived from transform's additive input port on "mapping")

#### Scenario: Auto-wire metric_capture from ai_sdk source

- **WHEN** a user connects an ai_sdk node with label "eval" to a metric_capture node
- **THEN** a new metrics entry with value `steps.eval.text` and an empty key is added (derived from metric_capture's additive input port on "metrics")

#### Scenario: Auto-wire target from trigger source

- **WHEN** a user connects the trigger node (schema has key "prompt") to an ai_sdk node whose promptTemplate is empty
- **THEN** the target node's promptTemplate is set to `trigger.prompt`

#### Scenario: Auto-wire does not overwrite existing config

- **WHEN** a user connects node A to an ai_sdk target node whose promptTemplate already has a value
- **THEN** the existing value is preserved and not overwritten (scalar mode skips non-empty fields)

#### Scenario: Auto-wire skips sandbox source

- **WHEN** a user connects a sandbox node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config (sandbox has empty outputs array)

#### Scenario: Auto-wire skips condition source

- **WHEN** a user connects a condition node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config (condition has empty outputs array)
