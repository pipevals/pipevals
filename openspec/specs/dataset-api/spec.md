### Requirement: Dataset schema tables
The system SHALL define a `dataset` table with columns: `id` (text PK, auto-generated UUID), `name` (text, not null), `description` (text, nullable), `schema` (JSONB, not null — a record of key names to empty-string defaults representing the shape of each item), `organizationId` (text FK to organization, cascade delete, not null), `createdBy` (text FK to user, cascade delete, not null), `createdAt` (timestamp, default now), `updatedAt` (timestamp, auto-updated). The table MUST have an index on `organizationId`.

The system SHALL define a `dataset_item` table with columns: `id` (text PK, auto-generated UUID), `datasetId` (text FK to dataset, cascade delete, not null), `data` (JSONB, not null — a record matching the dataset's schema), `index` (integer, not null — ordering position), `createdAt` (timestamp, default now). The table MUST have an index on `datasetId` and a unique index on `(datasetId, index)`.

#### Scenario: Tables exist after migration
- **WHEN** the database migration runs
- **THEN** both `dataset` and `dataset_item` tables exist with all specified columns, constraints, and indexes

### Requirement: Create dataset
The system SHALL expose `POST /api/datasets` to create a new dataset. The request body MUST include `name` (string) and `schema` (record of key names to empty-string defaults). The request body MAY include `description` (string) and `items` (array of objects conforming to the schema). The dataset MUST be scoped to the authenticated user's active organization. If `items` are provided, they MUST be validated against the schema and inserted as `dataset_item` rows with sequential `index` values starting at 0.

#### Scenario: Create dataset with schema only
- **WHEN** an authenticated user sends `POST /api/datasets` with `{ "name": "Golden Set", "schema": { "prompt": "", "expected": "" } }`
- **THEN** the system returns 201 with the created dataset including its id, name, schema, and an empty items count of 0

#### Scenario: Create dataset with initial items
- **WHEN** an authenticated user sends `POST /api/datasets` with `{ "name": "Golden Set", "schema": { "prompt": "", "expected": "" }, "items": [{ "prompt": "hello", "expected": "Hi there" }] }`
- **THEN** the system returns 201 with the created dataset and 1 item inserted

#### Scenario: Create dataset with invalid items
- **WHEN** an authenticated user sends items that do not match the schema (missing keys or extra keys)
- **THEN** the system returns 400 with a validation error

#### Scenario: Unauthenticated request
- **WHEN** a request is sent without valid authentication
- **THEN** the system returns 401

### Requirement: List datasets
The system SHALL expose `GET /api/datasets` to list all datasets in the authenticated user's active organization. The response MUST include each dataset's id, name, description, schema, item count, and timestamps. Results MUST be ordered by `createdAt` descending.

#### Scenario: List datasets
- **WHEN** an authenticated user sends `GET /api/datasets` and their organization has 3 datasets
- **THEN** the system returns 200 with an array of 3 dataset objects including item counts

#### Scenario: Empty list
- **WHEN** an authenticated user's organization has no datasets
- **THEN** the system returns 200 with an empty array

### Requirement: Get dataset with items
The system SHALL expose `GET /api/datasets/:id` to retrieve a dataset with all its items. The response MUST include the dataset metadata and an `items` array ordered by `index` ascending. The system MUST verify the dataset belongs to the authenticated user's organization.

#### Scenario: Get dataset with items
- **WHEN** an authenticated user requests a dataset with 10 items
- **THEN** the system returns 200 with the dataset metadata and all 10 items ordered by index

#### Scenario: Dataset not found
- **WHEN** a user requests a dataset id that doesn't exist or belongs to another organization
- **THEN** the system returns 404

### Requirement: Update dataset metadata
The system SHALL expose `PUT /api/datasets/:id` to update a dataset's name and description. The schema MUST NOT be changeable after creation (to avoid invalidating existing items).

#### Scenario: Update dataset name
- **WHEN** an authenticated user sends `PUT /api/datasets/:id` with `{ "name": "Updated Name" }`
- **THEN** the system updates the name and returns 200

#### Scenario: Attempt to change schema
- **WHEN** an authenticated user sends `PUT /api/datasets/:id` with a `schema` field
- **THEN** the system ignores the schema field and only updates name/description

### Requirement: Delete dataset
The system SHALL expose `DELETE /api/datasets/:id` to delete a dataset and all its items via cascade. The system MUST verify the dataset belongs to the authenticated user's organization.

#### Scenario: Delete dataset
- **WHEN** an authenticated user sends `DELETE /api/datasets/:id`
- **THEN** the dataset and all items are deleted and the system returns 204

### Requirement: Add items to dataset
The system SHALL expose `POST /api/datasets/:id/items` to add items to an existing dataset. The request body MUST be an array of objects. Each object MUST be validated against the dataset's schema. Items MUST be appended with `index` values continuing from the current maximum index.

#### Scenario: Add items to dataset
- **WHEN** a dataset has 5 items (indexes 0-4) and the user sends 3 new items
- **THEN** the 3 items are inserted with indexes 5, 6, 7 and the system returns 201

#### Scenario: Add items with invalid data
- **WHEN** items do not conform to the dataset's schema
- **THEN** the system returns 400 with a validation error and no items are inserted

### Requirement: Delete item from dataset
The system SHALL expose `DELETE /api/datasets/:id/items/:itemId` to remove a single item from a dataset. The system MUST NOT re-index remaining items (gaps in index values are acceptable).

#### Scenario: Delete single item
- **WHEN** an authenticated user deletes an item from a dataset with 5 items
- **THEN** the item is deleted, the system returns 204, and the remaining 4 items keep their original index values
