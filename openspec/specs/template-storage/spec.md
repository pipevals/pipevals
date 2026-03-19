### Requirement: Pipeline template table schema
The system SHALL provide a `pipeline_template` table with the following columns:
- `id` (text, PK, auto-generated UUID)
- `name` (text, NOT NULL)
- `slug` (text, NOT NULL)
- `description` (text, nullable)
- `triggerSchema` (jsonb, default `{}`)
- `graphSnapshot` (jsonb, NOT NULL) storing `{ nodes: [...], edges: [...] }`
- `organizationId` (text, nullable, FK to `organization.id` with `ON DELETE CASCADE`)
- `createdBy` (text, nullable, FK to `user.id` with `ON DELETE CASCADE`)
- `createdAt` (timestamp, default now, NOT NULL)
- `updatedAt` (timestamp, default now, auto-update, NOT NULL)

#### Scenario: Table exists with correct columns
- **WHEN** the database migration has been applied
- **THEN** the `pipeline_template` table exists with all specified columns and constraints

### Requirement: Built-in template uniqueness
The system SHALL enforce a partial unique index on `slug` for templates where `organization_id IS NULL`, ensuring no two built-in templates share the same slug.

#### Scenario: Duplicate built-in slug rejected
- **WHEN** a built-in template with slug `ai-as-a-judge-scoring` exists and another built-in template with the same slug is inserted
- **THEN** the database rejects the insert with a unique constraint violation

### Requirement: Org-scoped template uniqueness
The system SHALL enforce a partial unique index on `(slug, organization_id)` for templates where `organization_id IS NOT NULL`, ensuring no two templates within the same org share the same slug.

#### Scenario: Duplicate org-scoped slug rejected
- **WHEN** org "acme" has a template with slug `my-eval` and another template with slug `my-eval` is inserted for org "acme"
- **THEN** the database rejects the insert with a unique constraint violation

#### Scenario: Same slug in different orgs allowed
- **WHEN** org "acme" has a template with slug `my-eval` and a template with slug `my-eval` is inserted for org "beta"
- **THEN** the insert succeeds

### Requirement: Graph snapshot shape
The `graphSnapshot` column SHALL store a JSON object with `nodes` and `edges` arrays, following the same shape as `pipelineRuns.graphSnapshot`. Each node object SHALL include `id`, `type`, `label`, `config`, `positionX`, and `positionY`. Each edge object SHALL include `id`, `sourceNodeId`, `sourceHandle`, `targetNodeId`, and `targetHandle`.

#### Scenario: Valid graph snapshot stored
- **WHEN** a template is created with a `graphSnapshot` containing 4 nodes and 3 edges
- **THEN** the stored snapshot preserves the full structure of all nodes and edges

### Requirement: Drizzle relations
The system SHALL define Drizzle relations for `pipeline_template`:
- `organization`: optional one-to-one with `organization` table
- `creator`: optional one-to-one with `user` table

#### Scenario: Template relations queryable
- **WHEN** a template with `organizationId` and `createdBy` is queried with relations
- **THEN** the related organization and user records are accessible
