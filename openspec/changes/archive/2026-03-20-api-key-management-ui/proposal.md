## Why

Users can now authenticate via API keys (from the `api-key-auth` change), but there's no way to create, view, or revoke them. Without a management UI, keys can only be created via direct API calls, which defeats the purpose of making programmatic access easy for CI and SDK users.

## What Changes

- Add a new org-level settings page at `/settings/api-keys` with a table listing all API keys for the current user in the active organization.
- Add a "Create API Key" dialog that generates a key, displays it once for copying, and warns that it won't be shown again.
- Add key revocation via a dropdown menu action with an AlertDialog confirmation.
- Add the `apiKeyClient` plugin to `lib/auth-client.ts` so client components can call the API key endpoints.
- Add a settings layout shell at `/settings` with a sidebar for future settings pages.

## Capabilities

### New Capabilities
- `api-key-management-ui`: Settings page for creating, listing, copying, and revoking API keys with org-scoped display.

### Modified Capabilities

(none)

## Impact

- **New routes**: `app/settings/layout.tsx`, `app/settings/page.tsx` (redirect), `app/settings/api-keys/page.tsx`
- **New components**: `ApiKeyTable`, `CreateApiKeyDialog`
- **Auth client**: `lib/auth-client.ts` gains the `apiKeyClient` plugin import
- **Dependencies**: None new — all required shadcn components (`table`, `dialog`, `alert-dialog`, `badge`, `dropdown-menu`, `button`, `input`, `tooltip`, `empty`) are already installed
