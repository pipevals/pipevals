### Requirement: Auth helpers return member role
`requireAuth()` SHALL query the `member` table using the session's `userId` and `activeOrganizationId` and include the member's `role` in its return value.

#### Scenario: Authenticated user gets role in auth result
- **WHEN** an authenticated user with an active organization calls any API endpoint
- **THEN** the auth helper returns `{ session, userId, organizationId, role }` where `role` is the member's role string (e.g., `"guest"`, `"member"`, `"owner"`, `"admin"`)

#### Scenario: No member record found
- **WHEN** an authenticated user has an active organization but no matching member record exists
- **THEN** the auth helper SHALL return a 403 response

### Requirement: Write option blocks guest role
`requireAuth({ write: true })`, `requirePipeline(id, { write: true })`, and `requireDataset(id, { write: true })` SHALL return a 403 response with `{ error: "Insufficient permissions" }` when the member's role is `"guest"`.

#### Scenario: Guest calls mutation endpoint with write flag
- **WHEN** a guest user calls an endpoint that uses `requireAuth({ write: true })`
- **THEN** the endpoint returns 403 with body `{ error: "Insufficient permissions" }`

#### Scenario: Member calls mutation endpoint with write flag
- **WHEN** a member (non-guest) user calls an endpoint that uses `requireAuth({ write: true })`
- **THEN** the auth check passes and the handler executes normally

#### Scenario: Guest calls read endpoint without write flag
- **WHEN** a guest user calls an endpoint that uses `requireAuth()` (no write flag)
- **THEN** the auth check passes and the handler executes normally

### Requirement: requirePipeline supports write option
`requirePipeline(id, { write: true })` SHALL perform auth, role check, and pipeline ownership verification in a single pass.

#### Scenario: Guest reads pipeline
- **WHEN** a guest calls `GET /api/pipelines/[id]` (which uses `requirePipeline(id)`)
- **THEN** the pipeline is returned successfully

#### Scenario: Guest tries to update pipeline
- **WHEN** a guest calls `PUT /api/pipelines/[id]` (which uses `requirePipeline(id, { write: true })`)
- **THEN** the endpoint returns 403 with body `{ error: "Insufficient permissions" }`

### Requirement: requireDataset supports write option
`requireDataset(id, { write: true })` SHALL perform auth, role check, and dataset ownership verification in a single pass.

#### Scenario: Guest reads dataset
- **WHEN** a guest calls `GET /api/datasets/[id]` (which uses `requireDataset(id)`)
- **THEN** the dataset is returned successfully

#### Scenario: Guest tries to delete dataset
- **WHEN** a guest calls `DELETE /api/datasets/[id]` (which uses `requireDataset(id, { write: true })`)
- **THEN** the endpoint returns 403 with body `{ error: "Insufficient permissions" }`

### Requirement: Page-level auth returns role
`requireSessionWithOrg()` SHALL return the member's `role` alongside `session`, `user`, and `organizationId`.

#### Scenario: Server component gets role for UI gating
- **WHEN** a page's server component calls `requireSessionWithOrg()`
- **THEN** the result includes `role` as a string (e.g., `"guest"`, `"member"`)
