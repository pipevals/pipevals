## ADDED Requirements

### Requirement: Auto-add new users to default organization on allowed hosts with guest role
When the `BETTER_AUTH_URL` hostname is in the hardcoded allowed hosts list, the system SHALL automatically add every newly registered user as a `guest` of the organization with `slug: "demo"` immediately after user creation.

#### Scenario: New user registers on allowed host
- **WHEN** `BETTER_AUTH_URL` resolves to an allowed hostname (e.g. `localhost`) and a new user completes registration (via any provider)
- **THEN** a row SHALL be inserted into the `member` table with `organizationId` matching the `demo` org, `userId` matching the new user, and `role = "guest"`

#### Scenario: New user registers on disallowed host
- **WHEN** `BETTER_AUTH_URL` resolves to a hostname not in the allowed list and a new user completes registration
- **THEN** no automatic membership row SHALL be created

### Requirement: Allowed hosts are hardcoded
The set of hostnames that enable auto-invite SHALL be defined as a constant in the codebase (not configurable via environment variable). Changing the allowed hosts SHALL require a code change.

#### Scenario: Attempt to enable auto-invite via env var alone
- **WHEN** no code change is made to the allowed hosts list but `BETTER_AUTH_URL` is set to any value
- **THEN** auto-invite SHALL only activate if the hostname matches the hardcoded allowlist

### Requirement: Auto-membership uses databaseHooks
The auto-membership logic SHALL be implemented as a Better Auth `databaseHooks.user.create.after` hook so it fires for all authentication providers (GitHub OAuth, future email/password, etc.).

#### Scenario: User registers via GitHub OAuth
- **WHEN** a user signs up through GitHub OAuth on an allowed host
- **THEN** the `databaseHooks.user.create.after` hook SHALL fire and create the membership

### Requirement: Auto-membership is idempotent
The hook SHALL handle the case where the user is already a member of the default organization (e.g., due to a race condition or retry) without throwing an error.

#### Scenario: Hook fires but membership already exists
- **WHEN** the hook attempts to insert a member row that already exists (same `userId` + `organizationId`)
- **THEN** the insert SHALL be skipped or use conflict resolution, and no error SHALL be thrown

### Requirement: Hook does not block registration on failure
If the default organization does not exist in the database (e.g., seed was not run), the hook SHALL log a warning and allow registration to proceed without error.

#### Scenario: Default organization missing from database
- **WHEN** the app is running on an allowed host but no organization with `slug = "demo"` exists and a user registers
- **THEN** the hook SHALL log a warning and the user SHALL be created successfully without a membership row

### Requirement: Custom guest role with minimal permissions
The organization plugin SHALL define a `guest` role using Better Auth's static access control (`ac`) system. The `guest` role SHALL have read-only permission on the `organization` resource only — no access to `member` or `invitation` resources.

#### Scenario: Guest user attempts any privileged org API call
- **WHEN** a user with `role = "guest"` calls a Better Auth client API that requires member or invitation permissions (e.g. `inviteMember`, `listMembers`, `updateMemberRole`, `removeMember`)
- **THEN** the API SHALL reject the request due to insufficient permissions

#### Scenario: Guest user reads organization
- **WHEN** a user with `role = "guest"` calls a Better Auth client API that requires organization read permission (e.g. `getFullOrganization`, setting active org)
- **THEN** the API SHALL allow the request
