## MODIFIED Requirements

### Requirement: Node palette

The system SHALL provide a sidebar palette listing all available step types organized into categories:
- **Execute**: API Request, AI SDK, Sandbox
- **Flow**: Condition, Transform
- **Measure**: Metric Capture
- **Review**: Human Review

Users MUST be able to drag a step type from the palette onto the canvas to create a new node of that type. Each category MUST have a visual separator or heading.

#### Scenario: Drag node from palette

- **WHEN** a user drags "AI SDK" from the palette onto the canvas at position (300, 200)
- **THEN** a new AI SDK node is created at that position with default config and a default label

#### Scenario: Palette lists all step types in categories

- **WHEN** the palette is rendered
- **THEN** it displays all seven step types organized into four categories: Execute (3), Flow (2), Measure (1), Review (1)

#### Scenario: Drag human review from palette

- **WHEN** a user drags "Human Review" from the Review category onto the canvas
- **THEN** a new human_review node is created with default config (empty display, empty rubric, requiredReviewers: 1)

## ADDED Requirements

### Requirement: Human review config panel

The system SHALL render a config panel for `human_review` nodes with three sections:

**Display Data section**: A key-value editor where keys are display labels (strings) and values are dot-path expressions. Users MUST be able to add and remove display entries.

**Rubric section**: A list editor for rubric fields. Each field row MUST show the field name, type selector (rating, boolean, text, select), and type-specific options:
- For `rating`: min and max number inputs
- For `boolean`: the label text
- For `text`: optional placeholder
- For `select`: a comma-separated list of options

Users MUST be able to add new rubric fields and remove existing ones.

**Reviewers section**: A number input for `requiredReviewers` with a minimum value of 1.

#### Scenario: Add a rating rubric field

- **WHEN** a user clicks "Add field" in the rubric section and configures it as name: "accuracy", type: "rating", min: 1, max: 5
- **THEN** the rubric array in the node's config is updated with the new field

#### Scenario: Edit display mapping

- **WHEN** a user adds a display entry with label "AI Response" and path "steps.llm.text"
- **THEN** the `display` config is updated to include `{ "AI Response": "steps.llm.text" }`

#### Scenario: Set required reviewers

- **WHEN** a user sets the required reviewers field to 3
- **THEN** the node's `requiredReviewers` config is updated to 3
