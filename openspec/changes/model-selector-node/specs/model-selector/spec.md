## ADDED Requirements

### Requirement: Model list API endpoint
The system SHALL expose a `GET /api/models` endpoint that returns available AI Gateway models. The response SHALL be a JSON object with a `models` array. Each model entry SHALL include `id` (string, provider/model format), `name` (string), and `provider` (string extracted from the id prefix). The endpoint SHALL return an empty array if the gateway is unreachable.

#### Scenario: Successful model fetch
- **WHEN** a GET request is made to `/api/models`
- **THEN** the response SHALL be `200` with `{ models: [{ id, name, provider }, ...] }` containing all available gateway models

#### Scenario: Gateway unreachable
- **WHEN** a GET request is made to `/api/models` and the AI Gateway is unavailable
- **THEN** the response SHALL be `200` with `{ models: [] }`

### Requirement: Model selector combobox in AI SDK config panel
The AI SDK node config panel SHALL replace the plain text input for the `model` field with a searchable combobox. The combobox SHALL display models grouped by provider. The user SHALL be able to type to filter models by name or provider. The selected model SHALL be stored as a `provider/model` string in the node config, identical to the current format.

#### Scenario: User selects a model from the list
- **WHEN** the user opens the model combobox in an AI SDK node's config panel
- **AND** selects "anthropic/claude-sonnet-4.5" from the list
- **THEN** the node config `model` field SHALL be set to `"anthropic/claude-sonnet-4.5"`

#### Scenario: User searches for a model
- **WHEN** the user types "claude" into the combobox search field
- **THEN** only models whose id or name contains "claude" SHALL be visible

#### Scenario: User types a custom model string
- **WHEN** the user types a model string that is not in the fetched list (e.g. a fine-tuned model)
- **THEN** the combobox SHALL accept the custom value and store it in the node config

### Requirement: Models grouped by provider
The combobox SHALL group models under provider headers (e.g. "Anthropic", "OpenAI", "Google"). Providers SHALL be sorted alphabetically. Models within each provider group SHALL be sorted alphabetically.

#### Scenario: Provider grouping display
- **WHEN** the model combobox is opened
- **THEN** models SHALL appear under labeled provider groups in alphabetical order

### Requirement: Graceful degradation on fetch failure
If the model list fails to load, the combobox SHALL fall back to a plain text input so the user can still type a model string manually. A brief inline message SHALL indicate that the model list could not be loaded.

#### Scenario: Fetch failure fallback
- **WHEN** the `/api/models` request fails or returns an empty list
- **THEN** the model field SHALL render as a text input with placeholder text indicating manual entry
- **AND** an inline note SHALL inform the user that models could not be loaded
