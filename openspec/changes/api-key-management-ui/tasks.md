## 1. Auth Client

- [x] 1.1 Add `apiKeyClient` plugin from `@better-auth/api-key/client` to `lib/auth-client.ts`

## 2. Settings Layout

- [ ] 2.1 Create `app/settings/layout.tsx` — server component with `requireSessionWithOrg()`, sidebar with "API Keys" link, and content area
- [ ] 2.2 Create `app/settings/page.tsx` — redirect to `/settings/api-keys`

## 3. API Keys Page

- [ ] 3.1 Create `app/settings/api-keys/page.tsx` — server component shell that renders the client component
- [ ] 3.2 Create `components/settings/api-key-table.tsx` — client component that fetches keys via `authClient.apiKey.list()` and renders a Table with name, prefix, created, expires, and status columns
- [ ] 3.3 Add empty state when no keys exist using the `Empty` component with a "Create API Key" CTA
- [ ] 3.4 Add status Badge per row — "Active" (default) or "Expired" (when `expiresAt` is in the past)

## 4. Create Key Dialog

- [ ] 4.1 Create `components/settings/create-api-key-dialog.tsx` — Dialog with name Input, Create Button, and two states: form and key-reveal
- [ ] 4.2 In key-reveal state, display the full key in monospace with a copy-to-clipboard Button and a warning that the key won't be shown again
- [ ] 4.3 On dialog close after creation, clear the key from state and refresh the key list
- [ ] 4.4 Validate that name is non-empty before submission

## 5. Revoke Key

- [ ] 5.1 Add a DropdownMenu to each table row with a "Revoke" action
- [ ] 5.2 Wire the Revoke action to an AlertDialog confirmation that calls `authClient.apiKey.delete()` and removes the key from the list on success

## 6. Curl Command API Key Injection

- [ ] 6.1 Create `lib/stores/api-key.ts` — Zustand store with `keyPrefix: string | null` and a `fetchKeyPrefix` action that calls `authClient.apiKey.list()` and caches the first key's `start` field
- [ ] 6.2 Initialize the store on app load (e.g., in the settings layout or a shared provider) so `keyPrefix` is populated when the user has at least one key
- [ ] 6.3 Update `copyCurl` in `components/pipeline/pipeline-list.tsx` to read `keyPrefix` from the store and inject `-H "x-api-key: <prefix>..."` into the curl command when a key exists

## 7. Navigation

- [ ] 7.1 Add a "Settings" link to the app header or sidebar that navigates to `/settings/api-keys`
