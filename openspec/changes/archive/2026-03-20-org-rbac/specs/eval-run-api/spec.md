## MODIFIED Requirements

### Requirement: Start eval run
The system SHALL allow authenticated users to start an eval run via `POST /api/pipelines/[id]/eval-runs`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to start eval run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/eval-runs`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member starts eval run
- **WHEN** a member sends `POST /api/pipelines/[id]/eval-runs` with valid dataset reference
- **THEN** the system creates the eval run and child runs
