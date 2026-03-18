## Requirements

### Requirement: Toast provider in root layout
The system SHALL render a `<Toaster>` component (from `sonner`) in the root layout so that toast notifications are available on every page.

#### Scenario: Toast rendered globally
- **WHEN** any page in the application is loaded
- **THEN** the `<Toaster>` component is mounted and ready to display notifications

### Requirement: API error helper
The system SHALL provide a `handleApiError` utility in `lib/handle-api-error.ts` that accepts a caught error or `Response`, extracts a human-readable message, and fires a `toast.error()` notification.

#### Scenario: Server error message surfaced
- **WHEN** an API response returns a non-OK status with a JSON body containing an `error` field
- **THEN** `handleApiError` fires a `toast.error` with that `error` message

#### Scenario: Generic fallback message
- **WHEN** the caught value is not a `Response` or the response body cannot be parsed
- **THEN** `handleApiError` fires a `toast.error` with a generic "Something went wrong" message

### Requirement: Toast on pipeline creation failure
The system SHALL show a toast error when creating a pipeline fails.

#### Scenario: Duplicate pipeline name
- **WHEN** a user submits the create pipeline form and the server returns a 409 conflict
- **THEN** a toast error appears with the server's error message

#### Scenario: Network failure on create
- **WHEN** the create pipeline request fails due to a network error
- **THEN** a toast error appears with a fallback message

### Requirement: Toast on pipeline deletion failure
The system SHALL show a toast error when deleting a pipeline fails.

#### Scenario: Delete fails with server error
- **WHEN** a user confirms pipeline deletion and the server returns a 4xx or 5xx response
- **THEN** a toast error appears with the server's error message

### Requirement: Toast on pipeline save failure
The system SHALL show a toast error when saving the pipeline graph fails, in addition to the existing `saveError` state that drives the toolbar indicator.

#### Scenario: Save returns server error
- **WHEN** the user saves the pipeline and the server returns a non-OK response
- **THEN** a toast error appears with the server's error message AND the toolbar save-error indicator is still shown

### Requirement: Toast on run trigger failure
The system SHALL show a toast error when triggering a pipeline run fails, in addition to the existing `triggerError` inline state.

#### Scenario: Trigger run returns validation error
- **WHEN** a user triggers a run and the server returns a 400 with a validation error message
- **THEN** a toast error appears with the server's error message AND the inline error text is still displayed

#### Scenario: Trigger run network failure
- **WHEN** a user triggers a run and the request fails due to a network error
- **THEN** a toast error appears with a fallback message
