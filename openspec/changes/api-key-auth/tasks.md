## 1. Dependencies & Database

- [x] 1.1 Install `@better-auth/api-key` package
- [x] 1.2 Add the `apiKey` plugin to `lib/auth.ts` with user-scoped references, `x-api-key` header, per-key rate limiting (60 req/60s), and 90-day default expiration
- [x] 1.3 Run `npx @better-auth/cli@latest generate` to generate the Drizzle migration for the `apiKey` table
- [x] 1.4 Apply the migration and verify the `apiKey` table exists

## 2. Auth Layer

- [x] 2.1 Determine whether the `apiKey` plugin hooks into `getSession()` automatically or requires a separate `verifyApiKey()` call (resolve the open question from design.md)
- [x] 2.2 Extend `requireAuth()` in `lib/api/auth.ts` to accept an `apiKey` boolean option — when true and `x-api-key` header is present, verify the key and return the userId; when false or unset, ignore the header entirely
- [x] 2.3 Extend `requirePipeline()` to handle API key auth: look up pipeline by ID (without org scoping), infer `organizationId` from the pipeline, verify the user's membership and role in that org
- [x] 2.4 Ensure non-whitelisted routes reject API key sessions even if the plugin auto-resolves them via `getSession()`

## 3. Route Integration

- [x] 3.1 Update `POST /api/pipelines/:id/runs` route handler to pass `apiKey: true` to `requirePipeline()`

## 4. Test Setup & Tests

- [ ] 4.1 Add the `apiKey` plugin to test auth instances in `lib/pipeline/__tests__/api/setup.ts`
- [ ] 4.2 Add a test helper to create an API key for a test user
- [ ] 4.3 Write tests: API key auth succeeds on the runs endpoint with a valid key
- [ ] 4.4 Write tests: API key auth returns 401 with an invalid/expired/disabled key
- [ ] 4.5 Write tests: API key auth returns 404 when the user is not a member of the pipeline's org
- [ ] 4.6 Write tests: API key auth returns 403 when the user has the guest role
- [ ] 4.7 Write tests: API key auth is rejected on non-whitelisted endpoints (e.g., PUT /api/pipelines/:id)
