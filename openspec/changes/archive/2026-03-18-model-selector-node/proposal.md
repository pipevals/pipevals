## Why

The AI SDK node's model field is a plain text input that requires users to type a `provider/model` string from memory (e.g. `openai/gpt-4o`). There are 100+ models available through the AI Gateway, and users have no way to discover, browse, or compare them. A model selector dropdown eliminates guesswork, reduces config errors, and surfaces models users didn't know were available.

## What Changes

- Replace the free-text model input in the AI SDK config panel with a searchable combobox that lists available gateway models
- Group models by provider (Anthropic, OpenAI, Google, etc.) for easy browsing
- Add a server endpoint to fetch available models from `gateway.getAvailableModels()` so the list stays current without redeployment

## Capabilities

### New Capabilities
- `model-selector`: Searchable combobox component for selecting AI Gateway models in the pipeline builder config panel, with provider grouping and dynamic model fetching

### Modified Capabilities

## Impact

- `components/pipeline/config-panel.tsx` — AI SDK fields section: replace text input with combobox
- New API route for model list (`/api/models` or similar)
- New UI component for the model combobox (or install AI Elements `model-selector`)
- No database schema changes — model field remains a string in JSONB config
- No changes to port declarations, auto-wiring, or step execution
