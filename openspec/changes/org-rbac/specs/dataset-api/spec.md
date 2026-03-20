## MODIFIED Requirements

### Requirement: Create dataset
The system SHALL allow authenticated users to create a new dataset via `POST /api/datasets`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to create dataset
- **WHEN** a guest user sends `POST /api/datasets`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

#### Scenario: Member creates dataset
- **WHEN** a member sends `POST /api/datasets` with valid schema and items
- **THEN** the system creates the dataset and returns 201

### Requirement: Update dataset
The system SHALL allow authenticated users to update a dataset via `PUT /api/datasets/[id]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to update dataset
- **WHEN** a guest user sends `PUT /api/datasets/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Delete dataset
The system SHALL allow authenticated users to delete a dataset via `DELETE /api/datasets/[id]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to delete dataset
- **WHEN** a guest user sends `DELETE /api/datasets/[id]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Add dataset items
The system SHALL allow authenticated users to add items via `POST /api/datasets/[id]/items`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to add items
- **WHEN** a guest user sends `POST /api/datasets/[id]/items`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`

### Requirement: Delete dataset item
The system SHALL allow authenticated users to delete an item via `DELETE /api/datasets/[id]/items/[itemId]`. The endpoint SHALL require write permission and return 403 for guest users.

#### Scenario: Guest tries to delete item
- **WHEN** a guest user sends `DELETE /api/datasets/[id]/items/[itemId]`
- **THEN** the system returns 403 with `{ error: "Insufficient permissions" }`
