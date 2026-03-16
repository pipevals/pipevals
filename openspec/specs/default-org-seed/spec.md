## ADDED Requirements

### Requirement: Seed script creates default demo organization via Better Auth SDK
The seed script (`db:seed`) SHALL create an organization with `name: "Demo"` and `slug: "demo"` using `auth.api.createOrganization` when the `BETTER_AUTH_URL` hostname is in the allowed hosts list.

#### Scenario: Seed runs on allowed host
- **WHEN** `BETTER_AUTH_URL` resolves to an allowed hostname (e.g. `localhost`) and `bun run db:seed` is executed
- **THEN** the `organization` table SHALL contain a row with `name = "Demo"` and `slug = "demo"`, created via the Better Auth SDK

#### Scenario: Seed runs on disallowed host
- **WHEN** `BETTER_AUTH_URL` resolves to a hostname not in the allowed list and `bun run db:seed` is executed
- **THEN** no organization row SHALL be inserted by the seed script and it SHALL log that auto-invite is not enabled for this host

### Requirement: Seed is idempotent
The seed script SHALL check whether an organization with `slug: "demo"` already exists before attempting creation, so that running it multiple times does not error or create duplicate rows.

#### Scenario: Seed runs twice consecutively
- **WHEN** `bun run db:seed` is executed twice on an allowed host
- **THEN** the `organization` table SHALL contain exactly one row with `slug = "demo"` and the script SHALL exit successfully both times

### Requirement: Seed logs outcome
The seed script SHALL log whether the organization was created or already existed.

#### Scenario: Organization created for the first time
- **WHEN** the seed runs and no `slug = "demo"` organization exists
- **THEN** the script SHALL log a message indicating the demo organization was created

#### Scenario: Organization already exists
- **WHEN** the seed runs and a `slug = "demo"` organization already exists
- **THEN** the script SHALL log a message indicating the demo organization already existed
