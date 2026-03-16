## ADDED Requirements

### Requirement: Auth rate limiting
The system SHALL enforce rate limiting on all Better Auth endpoints. The rate limiter MUST allow a maximum of 10 requests per 60-second window per IP address. The rate limiter MUST use in-memory storage.

#### Scenario: Requests within limit
- **WHEN** a client sends 10 sign-in requests within 60 seconds
- **THEN** all 10 requests are processed normally

#### Scenario: Requests exceed limit
- **WHEN** a client sends an 11th sign-in request within the same 60-second window
- **THEN** the system returns 429 Too Many Requests

### Requirement: Secret length validation
The system SHALL validate at module load time that the `BETTER_AUTH_SECRET` environment variable is set and at least 32 characters long. If validation fails, the system MUST throw an error that prevents the application from starting.

#### Scenario: Valid secret
- **WHEN** the application starts with a `BETTER_AUTH_SECRET` of 32 or more characters
- **THEN** the auth module initializes successfully

#### Scenario: Missing secret
- **WHEN** the application starts without `BETTER_AUTH_SECRET` set
- **THEN** the auth module throws an error and the application does not start

#### Scenario: Short secret
- **WHEN** the application starts with a `BETTER_AUTH_SECRET` shorter than 32 characters
- **THEN** the auth module throws an error and the application does not start

### Requirement: Organization plugin limits
The system SHALL configure the Better Auth organization plugin with explicit limits: a maximum of 5 organizations per user and 100 members per organization.

#### Scenario: Organization limit enforced
- **WHEN** a user who already has 5 organizations attempts to create a 6th
- **THEN** the system rejects the request

#### Scenario: Membership limit enforced
- **WHEN** an organization with 100 members attempts to add a 101st
- **THEN** the system rejects the request

### Requirement: Plugin tree-shaking imports
The system SHALL import Better Auth plugins from their dedicated sub-paths (e.g., `better-auth/plugins/organization`) rather than the barrel export (`better-auth/plugins`).

#### Scenario: Production bundle excludes unused plugin code
- **WHEN** the application is built for production
- **THEN** only the code for configured plugins is included in the server bundle
