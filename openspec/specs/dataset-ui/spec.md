### Requirement: Datasets nav entry
The app header MUST include a "Datasets" link as a top-level nav item alongside the existing navigation. The link MUST navigate to `/datasets`. The link MUST show an active state when the current path starts with `/datasets`.

#### Scenario: Datasets link in nav
- **WHEN** an authenticated user views any page
- **THEN** the app header contains a "Datasets" link pointing to `/datasets`

#### Scenario: Active state
- **WHEN** the user is on `/datasets` or `/datasets/abc-123`
- **THEN** the "Datasets" nav link shows an active visual state

### Requirement: Dataset list page
The system SHALL render a dataset list page at `/datasets`. The page MUST display all datasets in the user's organization as a list with each row showing the dataset name, description (truncated), item count, and creation date. The page MUST include a "New Dataset" button that opens a creation dialog. The page MUST support client-side search filtering by dataset name.

#### Scenario: View dataset list
- **WHEN** an authenticated user navigates to `/datasets` and has 3 datasets
- **THEN** the page shows 3 rows with name, item count, and creation date for each

#### Scenario: Empty state
- **WHEN** the user has no datasets
- **THEN** the page shows an empty state with a prompt to create their first dataset

#### Scenario: Search filtering
- **WHEN** the user types "golden" in the search field and has datasets "Golden Set" and "Edge Cases"
- **THEN** only "Golden Set" is shown

### Requirement: Create dataset dialog
The system SHALL provide a dialog for creating a new dataset. The dialog MUST collect: name (required), description (optional), and schema definition. The schema definition MUST allow the user to add key names (strings) that define the shape of each item. On submit, the dialog MUST call `POST /api/datasets` and navigate to the new dataset's detail page on success.

#### Scenario: Create dataset via dialog
- **WHEN** the user fills in name "QA Cases" and adds schema keys "prompt" and "expected", then clicks Create
- **THEN** the system creates the dataset and navigates to `/datasets/<new-id>`

#### Scenario: Validation
- **WHEN** the user submits without a name or without any schema keys
- **THEN** the dialog shows validation errors and does not submit

### Requirement: Dataset detail page
The system SHALL render a dataset detail page at `/datasets/[id]`. The page MUST show the dataset name, description, schema, and a table of all items. Each item row MUST display the item's data fields in columns matching the schema keys. The page MUST include an "Add Items" button and a delete button per item row.

#### Scenario: View dataset with items
- **WHEN** a user navigates to `/datasets/abc-123` for a dataset with schema `{ prompt, expected }` and 5 items
- **THEN** the page shows the dataset header and a table with columns "prompt" and "expected" containing 5 rows

#### Scenario: Delete item
- **WHEN** the user clicks the delete button on an item row and confirms
- **THEN** the item is deleted and removed from the table

### Requirement: Add items interface
The dataset detail page MUST provide an interface to add items. The user MUST be able to paste a JSON array of objects. On submit, the system MUST validate items against the dataset schema and call `POST /api/datasets/:id/items`. On success, the items table MUST refresh to show the new items.

#### Scenario: Add items via JSON paste
- **WHEN** the user pastes `[{ "prompt": "hello", "expected": "Hi" }]` and submits
- **THEN** the item is added to the dataset and appears in the table

#### Scenario: Invalid JSON
- **WHEN** the user pastes invalid JSON or objects missing required schema keys
- **THEN** the interface shows a validation error and does not submit
