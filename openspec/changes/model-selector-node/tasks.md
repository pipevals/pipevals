## 1. Dependencies & UI primitives

- [ ] 1.1 Add shadcn `Command` and `Popover` components (`npx shadcn@latest add command popover`)
- [ ] 1.2 Define `GatewayModel` type (`{ id: string; name: string; provider: string }`) in a shared types file

## 2. Model list API

- [ ] 2.1 Create `GET /api/models` route that calls `gateway.getAvailableModels()`, maps entries to `{ id, name, provider }`, and returns `{ models }` (empty array on failure)

## 3. Model selector combobox

- [ ] 3.1 Create a `ModelCombobox` component using `Command` + `Popover` that accepts `models`, `value`, and `onValueChange` props, groups items by provider, and supports type-to-filter
- [ ] 3.2 Add free-text fallback — if the combobox input doesn't match any model, allow submitting the raw string as a custom value
- [ ] 3.3 Add graceful degradation — when models array is empty, render a plain text input with an inline note

## 4. Config panel integration

- [ ] 4.1 Replace the model text `<input>` in `AiSdkFields` (`config-panel.tsx`) with the `ModelCombobox`, fetching models from `/api/models` on mount
- [ ] 4.2 Verify the selected model persists correctly through save/load cycle (node config JSONB round-trip)

## 5. Testing

- [ ] 5.1 Add unit test for `/api/models` route (mock gateway response, verify shape; mock failure, verify empty array)
- [ ] 5.2 Add unit test for `ModelCombobox` (renders grouped models, filters on search, accepts custom value)
