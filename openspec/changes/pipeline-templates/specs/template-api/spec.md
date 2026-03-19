## ADDED Requirements

### Requirement: List templates
The system SHALL expose `GET /api/templates` to list all templates visible to the authenticated user. The response SHALL include both built-in templates (`organizationId = NULL`) and templates scoped to the user's active organization. The response SHALL return an array of template objects containing `id`, `name`, `slug`, `description`, `organizationId` (null for built-in), `createdAt`, and `updatedAt`. The response SHALL NOT include `graphSnapshot` in the list to keep payloads small.

#### Scenario: List templates with built-in and org-scoped
- **WHEN** an authenticated user with org "acme" sends `GET /api/templates` and there are 3 built-in templates and 2 org-scoped templates for "acme"
- **THEN** the system returns 200 with an array of 5 template objects

#### Scenario: Org-scoped templates from other orgs not visible
- **WHEN** org "beta" has 2 templates and the authenticated user belongs to org "acme"
- **THEN** `GET /api/templates` does not include org "beta"'s templates

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

### Requirement: Create org-scoped template
The system SHALL expose `POST /api/templates` to create a template scoped to the user's active organization. The request body MUST include `name` (string), `graphSnapshot` (object with `nodes` and `edges` arrays), and `triggerSchema` (object). `description` is optional. The system SHALL generate a `slug` from the name using the `slugify` utility. The `organizationId` SHALL be set from the authenticated session. The `createdBy` SHALL be set to the authenticated user's ID.

#### Scenario: Create org-scoped template
- **WHEN** an authenticated user sends `POST /api/templates` with `{ "name": "My RAG Eval", "graphSnapshot": { "nodes": [...], "edges": [...] }, "triggerSchema": { "query": "" } }`
- **THEN** the system returns 201 with the created template including its generated slug `my-rag-eval`

#### Scenario: Duplicate slug in same org
- **WHEN** an org-scoped template with slug `my-eval` already exists in the user's org and another template with the same derived slug is created
- **THEN** the system returns 409 with an error message

#### Scenario: Missing required fields
- **WHEN** `POST /api/templates` is sent without a `name` field
- **THEN** the system returns 400 with a validation error

### Requirement: Delete org-scoped template
The system SHALL expose `DELETE /api/templates/:id` to delete a template. The system SHALL only allow deletion of templates where `organizationId` matches the user's active organization. Built-in templates (`organizationId = NULL`) SHALL NOT be deletable via this endpoint.

#### Scenario: Delete org-scoped template
- **WHEN** an authenticated user sends `DELETE /api/templates/:id` for a template belonging to their org
- **THEN** the system returns 200 and the template is removed

#### Scenario: Cannot delete built-in template
- **WHEN** an authenticated user sends `DELETE /api/templates/:id` for a built-in template
- **THEN** the system returns 403 with an error message

#### Scenario: Cannot delete another org's template
- **WHEN** an authenticated user sends `DELETE /api/templates/:id` for a template belonging to a different org
- **THEN** the system returns 404
