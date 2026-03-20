## MODIFIED Requirements

### Requirement: Pipeline nodes
The system SHALL store pipeline nodes with an id, pipeline_id (foreign key), type enum, label, slug (nullable text), config (jsonb), position_x (real), and position_y (real). The type enum MUST include: `api_request`, `ai_sdk`, `sandbox`, `condition`, `transform`, `metric_capture`. Deleting a pipeline MUST cascade-delete all its nodes. Non-null slug values MUST be unique within a pipeline, enforced by a partial unique index (`WHERE slug IS NOT NULL`).

#### Scenario: Add a node to a pipeline
- **WHEN** a node of type `ai_sdk` is added with label `"Generator"`, slug `"generator"`, config `{ "model": "gpt-4o", "provider": "openai" }` and position (200, 100)
- **THEN** the system persists the node linked to its pipeline with the given type, label, slug, config, and position

#### Scenario: Delete pipeline cascades to nodes
- **WHEN** a pipeline with 5 nodes is deleted
- **THEN** all 5 nodes are deleted

#### Scenario: Slug uniqueness within a pipeline
- **WHEN** two nodes in the same pipeline are assigned slug `"generator"`
- **THEN** the database rejects the insert/update with a unique constraint violation

#### Scenario: Null slugs do not conflict
- **WHEN** three nodes in the same pipeline all have slug `null`
- **THEN** the database allows all three (partial unique index excludes nulls)

#### Scenario: Same slug in different pipelines
- **WHEN** pipeline A has a node with slug `"generator"` and pipeline B also has a node with slug `"generator"`
- **THEN** both are allowed (uniqueness is scoped to pipeline_id)
