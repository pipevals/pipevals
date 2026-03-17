## MODIFIED Requirements

### Requirement: Create pipeline
The system SHALL expose `POST /api/pipelines` to create a new pipeline. The request body MUST include name and optional description. The server MUST generate a slug from the name using the `slugify` utility and resolve any slug collisions within the organization before inserting. The response MUST return the created pipeline with its id and slug. The pipeline MUST be scoped to the authenticated user's active organization.

#### Scenario: Create pipeline
- **WHEN** an authenticated user sends `POST /api/pipelines` with `{ "name": "GPT-4o Eval", "description": "Evaluate GPT-4o responses" }`
- **THEN** the system returns 201 with the created pipeline including its generated id and slug `"gpt-4o-eval"`

#### Scenario: Create pipeline with colliding name
- **WHEN** an authenticated user sends `POST /api/pipelines` with a name whose slug already exists in the org
- **THEN** the system returns 201 with the pipeline assigned a collision-resolved slug (e.g., `"gpt-4o-eval-2"`)

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

### Requirement: List pipelines
The system SHALL expose `GET /api/pipelines` to list all pipelines in the authenticated user's active organization. The response MUST include each pipeline's id, name, slug, description, and timestamps.

#### Scenario: List pipelines
- **WHEN** an authenticated user sends `GET /api/pipelines` and their organization has 3 pipelines
- **THEN** the system returns 200 with an array of 3 pipeline objects each containing a `slug` field

### Requirement: Get pipeline with graph
The system SHALL expose `GET /api/pipelines/:id` to retrieve a pipeline with its full graph (nodes and edges). The response MUST include the pipeline metadata (including `slug`) plus `nodes` and `edges` arrays. The response shape MUST be directly consumable by xyflow (nodes with id, type, position, data; edges with id, source, target, sourceHandle, targetHandle).

#### Scenario: Get pipeline with nodes and edges
- **WHEN** an authenticated user requests a pipeline that has 4 nodes and 3 edges
- **THEN** the system returns 200 with pipeline metadata including `slug`, a nodes array of 4 items, and an edges array of 3 items

#### Scenario: Pipeline not found
- **WHEN** a user requests a pipeline id that doesn't exist or belongs to another organization
- **THEN** the system returns 404
