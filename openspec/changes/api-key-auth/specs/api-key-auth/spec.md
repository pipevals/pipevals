## ADDED Requirements

### Requirement: API key plugin configuration
The system SHALL register the Better Auth `apiKey` plugin with user-scoped key references (`references: "user"`), the default `x-api-key` header, per-key rate limiting enabled (60 requests per 60-second window), and a default key expiration of 90 days.

#### Scenario: Plugin is registered
- **WHEN** the auth module initializes
- **THEN** the `apiKey` plugin is included in the Better Auth plugins array with user-scoped references, rate limiting enabled, and 90-day default expiration

### Requirement: API key route whitelist
The system SHALL only accept API key authentication on explicitly opted-in routes. All other routes MUST reject API key sessions and require cookie-based authentication. The opt-in mechanism SHALL be a flag (`apiKey: true`) passed to `requireAuth` or `requirePipeline` options.

#### Scenario: Whitelisted route accepts API key
- **WHEN** a request with a valid `x-api-key` header hits a route that passes `apiKey: true`
- **THEN** the system authenticates the request using the API key

#### Scenario: Non-whitelisted route rejects API key
- **WHEN** a request with a valid `x-api-key` header hits a route that does not pass `apiKey: true`
- **THEN** the system returns 401 as if no authentication was provided

#### Scenario: Cookie auth still works on whitelisted routes
- **WHEN** a request with valid session cookies (and no `x-api-key` header) hits a route that passes `apiKey: true`
- **THEN** the system authenticates via cookies as normal

### Requirement: Organization inference for API key requests
The system SHALL infer the organization from the resource being accessed when authenticating via API key. For pipeline routes, the system MUST look up the pipeline's `organizationId` and verify the API key user is a member of that organization. The request MUST NOT require an explicit organization header.

#### Scenario: API key user is member of pipeline's org
- **WHEN** a request with a valid API key targets a pipeline belonging to org X, and the API key user is a member of org X
- **THEN** the system authenticates successfully and proceeds with the request

#### Scenario: API key user is not member of pipeline's org
- **WHEN** a request with a valid API key targets a pipeline belonging to org X, and the API key user is not a member of org X
- **THEN** the system returns 404 (pipeline not found)

#### Scenario: API key user is a guest in the org
- **WHEN** a request with a valid API key targets a pipeline belonging to org X, and the API key user has the `guest` role in org X, and the route requires write access
- **THEN** the system returns 403 (insufficient permissions)

### Requirement: Invalid API key handling
The system SHALL return 401 when the `x-api-key` header is present but the key is invalid, expired, or disabled.

#### Scenario: Expired API key
- **WHEN** a request includes an `x-api-key` header with an expired key
- **THEN** the system returns 401

#### Scenario: Disabled API key
- **WHEN** a request includes an `x-api-key` header with a disabled key
- **THEN** the system returns 401

#### Scenario: Malformed API key
- **WHEN** a request includes an `x-api-key` header with an unrecognized key string
- **THEN** the system returns 401

### Requirement: API key rate limiting
The system SHALL enforce per-key rate limits. When a key exceeds its configured rate limit, the system MUST return 429.

#### Scenario: Rate limit exceeded
- **WHEN** an API key has made 60 requests within its 60-second window and sends another request
- **THEN** the system returns 429

#### Scenario: Rate limit resets after window
- **WHEN** an API key exceeded its rate limit and the time window has elapsed
- **THEN** the next request succeeds normally

### Requirement: Database migration for API keys
The system SHALL run `npx @better-auth/cli@latest generate` and apply the resulting Drizzle migration to create the `apiKey` table in PostgreSQL.

#### Scenario: Migration creates apiKey table
- **WHEN** the database migration runs
- **THEN** a new `apiKey` table exists with columns for id, key hash, userId, permissions, rate limit fields, expiration, enabled flag, and metadata
