## ADDED Requirements

### Requirement: Step slug derivation
The system SHALL provide a `stepSlugify(name: string): string` function that converts a display label into a step identifier. The function MUST lowercase the input, replace all non-alphanumeric character sequences with a single `_`, and strip leading/trailing `_` characters. The function MUST return an empty string when the input is empty or contains only non-alphanumeric characters.

#### Scenario: Simple label
- **WHEN** `stepSlugify("Generator")` is called
- **THEN** the result is `"generator"`

#### Scenario: Label with spaces
- **WHEN** `stepSlugify("Model A")` is called
- **THEN** the result is `"model_a"`

#### Scenario: Label with multiple spaces and mixed case
- **WHEN** `stepSlugify("Collect Responses")` is called
- **THEN** the result is `"collect_responses"`

#### Scenario: Label with special characters
- **WHEN** `stepSlugify("My Step #1!")` is called
- **THEN** the result is `"my_step_1"`

#### Scenario: Empty input
- **WHEN** `stepSlugify("")` is called
- **THEN** the result is `""`

#### Scenario: Only special characters
- **WHEN** `stepSlugify("!@#$")` is called
- **THEN** the result is `""`

### Requirement: Step slug validation
The system SHALL provide a `validateNodeSlugs(nodes: { id: string; slug: string | null }[]): string[]` function that returns an array of validation error messages. The function MUST enforce:
1. Non-null slugs MUST match the pattern `/^[a-z0-9]+(_[a-z0-9]+)*$/` (lowercase alphanumeric segments joined by single underscores).
2. Non-null slugs MUST be unique among all nodes in the array. Duplicate slugs MUST produce an error identifying the slug value.
3. Empty string slugs MUST produce a format error.
4. Null slugs MUST be allowed without error. Multiple nodes MAY have null slugs.

#### Scenario: All valid unique slugs
- **WHEN** `validateNodeSlugs` is called with nodes having slugs `["generator", "judge", "metrics"]`
- **THEN** the result is an empty array (no errors)

#### Scenario: Duplicate slugs
- **WHEN** `validateNodeSlugs` is called with two nodes both having slug `"model_a"`
- **THEN** the result contains an error message indicating `"model_a"` is duplicated

#### Scenario: Invalid slug format
- **WHEN** `validateNodeSlugs` is called with a node having slug `"Model A"` (contains space and uppercase)
- **THEN** the result contains a format error for that slug

#### Scenario: Empty string slug
- **WHEN** `validateNodeSlugs` is called with a node having slug `""`
- **THEN** the result contains a format error

#### Scenario: Null slugs are allowed
- **WHEN** `validateNodeSlugs` is called with three nodes all having slug `null`
- **THEN** the result is an empty array (no errors)

#### Scenario: Mixed null and non-null
- **WHEN** `validateNodeSlugs` is called with slugs `[null, "generator", null, "judge"]`
- **THEN** the result is an empty array (no errors)

### Requirement: Slug field in config panel
The system SHALL display a slug input field in the node configuration panel below the label field. The slug field MUST auto-derive its value from the label using `stepSlugify` whenever the label changes. The user MUST be able to manually edit the slug. Below the slug field, the system SHALL display a dot-path hint showing `"Reference as: steps.<slug>.<primaryOutputKey>"` when the node type has declared output ports. The hint MUST NOT appear for node types with no output ports (e.g., metric_capture).

#### Scenario: Slug auto-derives from label
- **WHEN** a user types `"Score Evaluator"` into the label field
- **THEN** the slug field updates to `"score_evaluator"`

#### Scenario: User manually edits slug
- **WHEN** a user changes the slug field from `"score_evaluator"` to `"scorer"`
- **THEN** the slug is set to `"scorer"` and the label remains unchanged

#### Scenario: Dot-path hint for AI SDK node
- **WHEN** an AI SDK node has slug `"llm"`
- **THEN** the hint text reads `"Reference as: steps.llm.text"`

#### Scenario: No dot-path hint for metric capture
- **WHEN** a metric_capture node is selected
- **THEN** no dot-path hint is displayed below the slug field

#### Scenario: Duplicate slug shows error
- **WHEN** a user sets a node's slug to a value already used by another node in the pipeline
- **THEN** the slug field shows a validation error before the user attempts to save

### Requirement: Auto-wire uses slug for dot-path construction
The system SHALL use the source node's slug (not raw label) when constructing dot-paths during auto-wire. The `resolveSourceDotPath` function MUST use `sourceSlug ?? sourceId` as the step identifier segment. This ensures auto-wired configs always contain valid, slug-based dot-paths.

#### Scenario: Auto-wire with slugified label
- **WHEN** a node with label `"Model A"` and slug `"model_a"` is connected to a downstream AI SDK node
- **THEN** the auto-wired prompt template contains `steps.model_a.text`

#### Scenario: Auto-wire falls back to node ID when slug is null
- **WHEN** a node with no slug (null) is connected to a downstream node
- **THEN** the auto-wired config uses the node ID as the step identifier

### Requirement: Input resolver keys by slug
The system SHALL key step outputs by the source node's slug in addition to the node ID during input resolution. The resolver MUST NOT key by raw label. When a source node has a slug, the resolver MUST set `steps[sourceNode.slug] = sourceOutput`. When a source node has no slug, only the node ID key is used.

#### Scenario: Resolve by slug
- **WHEN** a node with slug `"generator"` produces output `{ text: "hello" }`
- **THEN** the downstream node's input contains `steps.generator = { text: "hello" }`

#### Scenario: Resolve by node ID still works
- **WHEN** a node with ID `"node-abc"` and slug `"generator"` produces output
- **THEN** the downstream node's input contains both `steps["node-abc"]` and `steps.generator` pointing to the same output

#### Scenario: Null slug only keys by ID
- **WHEN** a node with ID `"node-xyz"` and slug `null` produces output
- **THEN** the downstream node's input contains only `steps["node-xyz"]`
