## MODIFIED Requirements

### Requirement: Node connection
The system SHALL allow users to draw edges between nodes by dragging from an output handle to an input handle. Condition nodes MUST display labeled output handles (e.g., "true"/"false" or custom labels). The system MUST prevent connections that would create a cycle. Condition node output handle arrays MUST be memoized to prevent unnecessary re-renders during canvas interactions. Upon creating a new connection, the system MUST automatically populate the target node's primary empty input field with a dot-path reference to the source node's primary output (e.g. `steps.<sourceLabel>.text`), unless the field already has a value. This auto-wire MUST NOT overwrite existing config values. Trigger node as source MUST use `trigger.<firstSchemaKey>` as the dot-path prefix. Step types with no predictable output shape (`sandbox`) and branching nodes (`condition`) MUST be skipped as auto-wire sources.

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
- **THEN** the target node's promptTemplate is set to `steps.llm.text`

#### Scenario: Auto-wire metric_capture from ai_sdk source
- **WHEN** a user connects an ai_sdk node with label "eval" to a metric_capture node whose extractPath is empty
- **THEN** the target node's extractPath is set to `steps.eval.text`

#### Scenario: Auto-wire condition expression from api_request source
- **WHEN** a user connects an api_request node with label "fetch" to a condition node whose expression is empty
- **THEN** the target node's expression is set to `steps.fetch.body`

#### Scenario: Auto-wire transform mapping from ai_sdk source
- **WHEN** a user connects an ai_sdk node with label "gen" to a transform node
- **THEN** a new mapping entry with value `steps.gen.text` and an empty key is added to the transform node's mapping

#### Scenario: Auto-wire target from trigger source
- **WHEN** a user connects the trigger node (schema has key "prompt") to an ai_sdk node whose promptTemplate is empty
- **THEN** the target node's promptTemplate is set to `trigger.prompt`

#### Scenario: Auto-wire does not overwrite existing config
- **WHEN** a user connects node A to a target node whose primary input field already has a value
- **THEN** the existing value is preserved and not overwritten

#### Scenario: Auto-wire skips sandbox source
- **WHEN** a user connects a sandbox node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config

#### Scenario: Auto-wire skips condition source
- **WHEN** a user connects a condition node to any target node
- **THEN** no auto-wire mutation occurs on the target node's config
