## MODIFIED Requirements

### Requirement: Create template
The system SHALL allow authenticated users to create a new template via `POST /api/templates`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to create template
- **WHEN** a guest user sends `POST /api/templates`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member creates template
- **WHEN** a member sends `POST /api/templates` with valid data
- **THEN** the system creates the template and returns 201

### Requirement: Delete template
The system SHALL allow authenticated users to delete an org-scoped template via `DELETE /api/templates/[id]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to delete template
- **WHEN** a guest user sends `DELETE /api/templates/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`
