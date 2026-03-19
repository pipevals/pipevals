## ADDED Requirements

### Requirement: Human review step registration

The system SHALL register a `human_review` entry in the step registry. The entry MUST include a handler function and port declarations. The `human_review` type MUST be added to `stepTypeEnum` and `pipelineNodeTypeEnum` in the database schema.

The handler registered in the step registry SHALL be a no-op placeholder (throwing an error if called directly) because `human_review` execution is handled at the workflow level, not through the standard `executeNode` path. The registry entry exists so that port declarations, default configs, and type validation work consistently with all other step types.

#### Scenario: Registry includes human review

- **WHEN** the step registry is loaded
- **THEN** it contains an entry for `human_review` with port declarations and a placeholder handler

#### Scenario: Direct handler invocation throws

- **WHEN** the `human_review` handler is called directly (bypassing the workflow-level path)
- **THEN** it throws an error indicating that human_review must be executed at the workflow level
