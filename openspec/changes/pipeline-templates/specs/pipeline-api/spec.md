## MODIFIED Requirements

### Requirement: Create pipeline
The system SHALL expose `POST /api/pipelines` to create a new pipeline. The request body MUST include `name` and optional `description`. The request body MAY include an optional `templateId` (string). The server MUST generate a slug from the name using the `slugify` utility and enforce slug uniqueness per organization via a DB constraint. When `templateId` is provided, the system SHALL:
1. Fetch the template and verify it is visible to the user (built-in or same org)
2. Copy the template's `triggerSchema` into the new pipeline
3. Generate fresh UUIDs for all nodes and edges from the template's `graphSnapshot`, remapping edge `sourceNodeId` and `targetNodeId` references to the new node UUIDs
4. Insert the pipeline, nodes, and edges atomically in a single transaction

The response MUST return the created pipeline with its id and slug. The pipeline MUST be scoped to the authenticated user's active organization.

#### Scenario: Create pipeline from template
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "My Eval", "templateId": "abc-123" }` and template `abc-123` exists and is visible
- **THEN** the system returns 201 with the created pipeline, pre-populated with the template's nodes, edges, and trigger schema (all with fresh UUIDs)

#### Scenario: Create pipeline with invalid template ID
- **WHEN** an authenticated user sends `POST /api/pipelines` with a `templateId` that does not exist or is not visible to the user
- **THEN** the system returns 404 with an error message

#### Scenario: Create pipeline without template
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "GPT-4o Eval" }` and no `templateId`
- **THEN** the system returns 201 with an empty pipeline (no nodes or edges), same as current behavior

#### Scenario: Create pipeline with colliding slug
- **WHEN** an authenticated user sends `POST /api/pipelines` with a name whose slug already exists in the org
- **THEN** the system returns 409 with an error message

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

#### Scenario: Fresh UUIDs in created pipeline
- **WHEN** a pipeline is created from a template and another pipeline is created from the same template
- **THEN** both pipelines have completely different node and edge IDs with no collisions
