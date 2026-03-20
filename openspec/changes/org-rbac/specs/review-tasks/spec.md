## MODIFIED Requirements

### Requirement: Submit task review
The system SHALL allow authenticated users to submit a task review via `POST /api/tasks/[id]/submit`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to submit task
- **WHEN** a guest user sends `POST /api/tasks/[id]/submit`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member submits task review
- **WHEN** a member sends `POST /api/tasks/[id]/submit` with valid review data
- **THEN** the system records the review and resumes the workflow
