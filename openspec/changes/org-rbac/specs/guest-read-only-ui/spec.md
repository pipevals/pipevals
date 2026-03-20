## ADDED Requirements

### Requirement: Mutation buttons disabled for guests
All pages SHALL render mutation controls (create, edit, delete, submit buttons) as `disabled` when the active member's role is `"guest"`.

#### Scenario: Guest sees disabled "New Pipeline" button
- **WHEN** a guest visits `/pipelines`
- **THEN** the "New Pipeline" button is rendered as disabled

#### Scenario: Member sees enabled "New Pipeline" button
- **WHEN** a member visits `/pipelines`
- **THEN** the "New Pipeline" button is rendered as enabled and clickable

### Requirement: Pipeline editor disabled for guests
The pipeline editor page SHALL disable save, add node, and delete controls when the active member's role is `"guest"`.

#### Scenario: Guest views pipeline editor
- **WHEN** a guest visits `/pipelines/[id]`
- **THEN** the save button, node addition controls, and delete actions are disabled

### Requirement: Dataset mutation controls disabled for guests
The datasets list and detail pages SHALL disable create, edit, delete, and add-item controls when the active member's role is `"guest"`.

#### Scenario: Guest views datasets list
- **WHEN** a guest visits `/datasets`
- **THEN** the "New Dataset" button is disabled

#### Scenario: Guest views dataset detail
- **WHEN** a guest visits `/datasets/[id]`
- **THEN** edit name, add item, and delete item controls are disabled

### Requirement: Run and eval-run trigger controls disabled for guests
Pages with run or eval-run trigger buttons SHALL disable those controls when the active member's role is `"guest"`.

#### Scenario: Guest views pipeline with run trigger
- **WHEN** a guest views a pipeline page that has a "Run" or "Eval Run" trigger button
- **THEN** those trigger buttons are disabled

### Requirement: Task submit disabled for guests
The task review page SHALL disable the submit/review button when the active member's role is `"guest"`.

#### Scenario: Guest views task detail
- **WHEN** a guest visits a task detail page
- **THEN** the submit/review button is disabled
