## MODIFIED Requirements

### Requirement: Create pipeline
The system SHALL allow authenticated users to create a new pipeline via `POST /api/pipelines`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to create pipeline
- **WHEN** a guest user sends `POST /api/pipelines`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member creates pipeline
- **WHEN** a member sends `POST /api/pipelines` with valid data
- **THEN** the system creates the pipeline and returns 201

### Requirement: Update pipeline
The system SHALL allow authenticated users to update a pipeline via `PUT /api/pipelines/[id]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to update pipeline
- **WHEN** a guest user sends `PUT /api/pipelines/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member updates pipeline
- **WHEN** a member sends `PUT /api/pipelines/[id]` with valid graph data
- **THEN** the system updates the pipeline and returns 200

### Requirement: Delete pipeline
The system SHALL allow authenticated users to delete a pipeline via `DELETE /api/pipelines/[id]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to delete pipeline
- **WHEN** a guest user sends `DELETE /api/pipelines/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Start pipeline run
The system SHALL allow authenticated users to start a pipeline run via `POST /api/pipelines/[id]/runs`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to start run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/runs`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Cancel pipeline run
The system SHALL allow authenticated users to cancel a running pipeline via `POST /api/pipelines/[id]/runs/[runId]/cancel`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to cancel run
- **WHEN** a guest user sends `POST /api/pipelines/[id]/runs/[runId]/cancel`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`
