## Context

The `api-key-auth` change added the Better Auth `apiKey` plugin with user-scoped keys and a whitelist approach for programmatic access. The backend endpoints (`create`, `list`, `delete`, `update`) are provided by the plugin out of the box at `/api/auth/api-key/*`. There is currently no settings area in the app — all pages are `pipelines`, `datasets`, and `sign-in`.

## Goals / Non-Goals

**Goals:**
- Let users create, view, and revoke API keys from an org-level settings page
- Show the full key exactly once after creation with a copy-to-clipboard action
- Establish a settings layout shell reusable for future settings pages

**Non-Goals:**
- API key permission scoping UI (keys inherit the user's org role)
- API key usage analytics or audit log
- Editing key expiration after creation
- Org member management (future settings page)

## Decisions

### 1. Settings route structure: `/settings/api-keys`

Create a settings layout at `app/settings/layout.tsx` with a sidebar navigation. The first (and for now only) page is `/settings/api-keys`. The `/settings` route itself redirects to `/settings/api-keys`.

**Alternative considered:** Putting API key management under `/org/settings`. Rejected because `/settings` is simpler and the sidebar can grow to include both user and org settings later.

### 2. Server Component page + Client Component table

The page at `app/settings/api-keys/page.tsx` is a Server Component that calls `requireSessionWithOrg()` for auth, then renders a Client Component `ApiKeyTable` that fetches and manages keys via the auth client.

**Why client-side fetching:** The Better Auth client provides `authClient.apiKey.list()`, `create()`, and `delete()` which handle auth headers automatically. Server-side fetching would require manual header forwarding. The key list is user-specific and changes frequently (create/delete), making client-side state management natural.

### 3. Key display: show once in Dialog, then only prefix

After creation, the full key is shown in a Dialog with a monospace display and copy button. Once dismissed, only the `start` field (first few characters) is visible in the table, matching the pattern of GitHub tokens and Stripe keys.

### 4. Components used (all already installed)

| Component | Usage |
|-----------|-------|
| `Table` | Key list: name, prefix, created, expires, last used |
| `Dialog` | Create key form + one-time key reveal |
| `AlertDialog` | Revoke confirmation |
| `Button` | Create, copy, revoke actions |
| `Badge` | Key status (active, expired) |
| `DropdownMenu` | Row actions (revoke) |
| `Input` | Key name field |
| `Tooltip` | Copy feedback |
| `Empty` | No keys state |

### 5. Auth client plugin addition

Add `apiKeyClient` from `@better-auth/api-key/client` to `lib/auth-client.ts`. This provides typed client methods: `authClient.apiKey.create()`, `.list()`, `.delete()`.

## Risks / Trade-offs

**[Risk] Key shown in client state after creation** → The full key exists in React state briefly. This is the same pattern used by GitHub, Stripe, and every other key management UI. The key is cleared from state when the dialog closes. Acceptable for this use case.

**[Risk] Settings layout is minimal initially** → With only one settings page, the sidebar may feel sparse. This is fine — the layout establishes the pattern and the sidebar grows naturally as settings pages are added.
