## ADDED Requirements

### Requirement: Define trigger input schema
The system SHALL allow pipeline authors to define a trigger input schema: an ordered list of named fields, each with a required `name` (identifier, no spaces) and an optional `description`. The schema MUST be stored as a JSONB array on the pipeline row. An empty array and null MUST both be treated as "no schema defined."

#### Scenario: Add a trigger field
- **WHEN** a user adds a field named `prompt` with description `"The prompt to evaluate"` to the trigger schema
- **THEN** the schema for that pipeline is `[{ "name": "prompt", "description": "The prompt to evaluate" }]` and is persisted on next save

#### Scenario: Empty schema is valid
- **WHEN** a pipeline has no trigger fields defined
- **THEN** the trigger schema is stored as `[]` or `null` and the pipeline operates normally

#### Scenario: Schema field order is preserved
- **WHEN** a user reorders trigger fields
- **THEN** the fields are stored and returned in the new order

### Requirement: Trigger schema in API
The system SHALL include `triggerSchema` in the response of `GET /api/pipelines/:id` and accept it in the body of `PUT /api/pipelines/:id`. The field MUST default to `[]` when null in the database.

#### Scenario: GET pipeline includes triggerSchema
- **WHEN** a user requests `GET /api/pipelines/:id` for a pipeline with two trigger fields
- **THEN** the response includes `"triggerSchema": [{ "name": "prompt" }, { "name": "model" }]`

#### Scenario: PUT pipeline persists triggerSchema
- **WHEN** a user sends `PUT /api/pipelines/:id` with `"triggerSchema": [{ "name": "input" }]`
- **THEN** the pipeline's trigger schema is updated and the next GET returns the updated schema

#### Scenario: GET pipeline with no schema returns empty array
- **WHEN** a pipeline has never had a trigger schema set
- **THEN** `GET /api/pipelines/:id` returns `"triggerSchema": []`
