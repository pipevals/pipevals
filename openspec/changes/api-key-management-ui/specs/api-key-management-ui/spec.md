## ADDED Requirements

### Requirement: Settings layout with sidebar navigation
The system SHALL provide a settings layout at `/settings` with a sidebar listing available settings pages. The sidebar MUST include a link to "API Keys". Navigating to `/settings` MUST redirect to `/settings/api-keys`.

#### Scenario: Navigate to settings
- **WHEN** a user navigates to `/settings`
- **THEN** the system redirects to `/settings/api-keys`

#### Scenario: Settings sidebar is visible
- **WHEN** a user is on any `/settings/*` page
- **THEN** a sidebar with navigation links is visible, with "API Keys" highlighted as active

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user navigates to `/settings/api-keys`
- **THEN** the system redirects to `/sign-in`

### Requirement: List API keys
The system SHALL display a table of the current user's API keys on the `/settings/api-keys` page. Each row MUST show the key name, key prefix (first few characters), creation date, expiration date, and status (active or expired). The table MUST be sorted by most recently created first.

#### Scenario: User has API keys
- **WHEN** a user navigates to `/settings/api-keys` and has 3 API keys
- **THEN** a table with 3 rows is displayed showing name, prefix, dates, and status for each key

#### Scenario: User has no API keys
- **WHEN** a user navigates to `/settings/api-keys` and has no API keys
- **THEN** an empty state is displayed with a message and a button to create the first key

#### Scenario: Expired key display
- **WHEN** a key's expiration date has passed
- **THEN** the status column shows an "Expired" badge

### Requirement: Create API key
The system SHALL provide a "Create API Key" button that opens a Dialog. The dialog MUST include a name input field and a "Create" submit button. After successful creation, the dialog MUST display the full API key in a monospace font with a copy-to-clipboard button. The dialog MUST warn that the key will not be shown again.

#### Scenario: Create a new key
- **WHEN** a user fills in "CI Pipeline" as the name and clicks Create
- **THEN** the system creates the key and displays the full key value in the dialog

#### Scenario: Copy key to clipboard
- **WHEN** the key is displayed after creation and the user clicks the copy button
- **THEN** the key is copied to the clipboard and the button shows a confirmation state

#### Scenario: Dismiss key dialog
- **WHEN** the user closes the create dialog after a key has been created
- **THEN** the full key is no longer accessible and the table refreshes to show the new key with only its prefix visible

#### Scenario: Create key with empty name
- **WHEN** the user clicks Create without entering a name
- **THEN** the system prevents submission and shows a validation message

### Requirement: Revoke API key
The system SHALL provide a revoke action for each key accessible via a dropdown menu on the table row. Clicking revoke MUST open an AlertDialog asking for confirmation. Confirming MUST delete the key and remove it from the table.

#### Scenario: Revoke a key
- **WHEN** a user selects "Revoke" from the row dropdown and confirms in the AlertDialog
- **THEN** the key is deleted and removed from the table

#### Scenario: Cancel revocation
- **WHEN** a user selects "Revoke" and then clicks Cancel in the AlertDialog
- **THEN** the key is not deleted and remains in the table

### Requirement: Auth client API key plugin
The system SHALL add the `apiKeyClient` plugin to the auth client in `lib/auth-client.ts` so that `authClient.apiKey.create()`, `.list()`, and `.delete()` are available to client components.

#### Scenario: Client can create keys
- **WHEN** a client component calls `authClient.apiKey.create({ name: "test" })`
- **THEN** the Better Auth API creates the key and returns the full key value
