## Why

Pipeline runs need to be triggerable from CI systems, SDKs, and CLI tools — not just the browser UI. Today every API endpoint requires a cookie-based session, making programmatic access impossible. Adding API key authentication lets users generate keys in the UI and use them in automated workflows.

## What Changes

- Add Better Auth `apiKey` plugin (`@better-auth/api-key`) with user-scoped keys, per-key rate limiting, and configurable expiration.
- Extend `requireAuth` / `requirePipeline` in `lib/api/auth.ts` with an opt-in `apiKey` flag so individual routes can accept API key authentication while all others remain cookie-only.
- For API key requests, infer the organization from the pipeline being accessed (no extra header needed) and verify the user's membership.
- Whitelist `POST /api/pipelines/:id/runs` as the first API-key-enabled endpoint.
- Run Better Auth CLI to generate the `apiKey` database table and apply migrations.

## Capabilities

### New Capabilities
- `api-key-auth`: API key creation, verification, rate limiting, and route-level opt-in for programmatic access to whitelisted endpoints.

### Modified Capabilities
- `pipeline-api`: The `POST /api/pipelines/:id/runs` endpoint gains an alternative authentication path via `x-api-key` header.

## Impact

- **Dependencies**: New package `@better-auth/api-key`.
- **Database**: New `apiKey` table managed by Better Auth.
- **Auth layer**: `lib/api/auth.ts` gains API key resolution branch in `requireAuth` and org-inference logic in `requirePipeline`.
- **Test setup**: `lib/pipeline/__tests__/api/setup.ts` needs the `apiKey` plugin added to test auth instances.
- **Existing routes**: No change — cookie-only by default unless explicitly opted in.
