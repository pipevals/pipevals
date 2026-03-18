## Context

The AI SDK node in the pipeline builder config panel currently uses a plain text input for the `model` field. Users must type a `provider/model` string (e.g. `openai/gpt-4o`) from memory. The AI Gateway supports 100+ models across providers (Anthropic, OpenAI, Google, Meta, Mistral, etc.), and there's no discovery mechanism in the UI.

The config panel (`components/pipeline/config-panel.tsx`) renders type-specific fields in a right sidebar. It uses a lightweight `Select` wrapper around native `<select>` for dropdowns (HTTP method, sandbox runtime). The model field is at lines 190-195.

## Goals / Non-Goals

**Goals:**
- Replace the text input with a searchable combobox for model selection
- Group models by provider for easy browsing
- Fetch models dynamically so the list stays current without code changes
- Preserve the existing `provider/model` string format in node config (no schema migration)

**Non-Goals:**
- Provider routing or failover configuration (future AI Gateway integration)
- Pricing display or cost estimation
- Model capability filtering (e.g. "supports vision", "supports tools")
- Changing how the AI SDK step executor uses the model string

## Decisions

### 1. Searchable combobox over plain dropdown

A `<select>` with 100+ options is unusable. A combobox with type-to-filter lets users narrow by provider name or model name. Use shadcn `Command` (cmdk-based) inside a `Popover` — this matches the pattern used by shadcn's combobox example and stays consistent with the existing UI library.

**Alternative considered:** Install AI Elements `model-selector` component. Rejected because it pulls in AI Elements dependencies (Streamdown, etc.) that aren't needed elsewhere in the app yet, and the config panel needs a compact inline combobox, not a standalone picker.

### 2. Server-side model fetching via API route

Create `GET /api/models` that calls `gateway.getAvailableModels()` and returns the list. The client fetches once on config panel mount and caches in component state.

**Alternative considered:** Import `GatewayModelId` type union and parse it into a static list at build time. Rejected because type unions aren't iterable at runtime, and a static list goes stale when new models are added to the gateway.

**Alternative considered:** Fetch directly from client. Rejected because `gateway.getAvailableModels()` requires server-side credentials (OIDC token).

### 3. Group by provider, sort alphabetically within groups

Display models grouped under provider headers (Anthropic, Google, OpenAI, etc.). Within each group, sort models alphabetically. This matches mental models — users typically know which provider they want first, then pick a specific model.

### 4. Keep free-text fallback

The combobox allows typing a custom value that isn't in the fetched list. This preserves the ability to use models not yet in the gateway list (e.g. fine-tuned models, new releases before the gateway updates).

## Risks / Trade-offs

- **Gateway availability** — If `getAvailableModels()` fails or the Vercel project isn't linked, the combobox falls back to a text input. Users can still type model strings manually.
  → Mitigation: Show a small "couldn't load models" inline note, degrade to text input.

- **Stale model list during session** — Models are fetched once on panel mount. If a new model is added mid-session, it won't appear until the panel remounts.
  → Acceptable trade-off for simplicity. Models don't change frequently.

- **New shadcn components needed** — The combobox pattern requires `Command` and `Popover` from shadcn. These are standard components and add minimal bundle size.
