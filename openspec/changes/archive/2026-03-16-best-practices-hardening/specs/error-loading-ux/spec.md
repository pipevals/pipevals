## ADDED Requirements

### Requirement: Root error boundary
The system SHALL provide a root error boundary (`app/error.tsx`) that catches unhandled errors and displays a user-friendly error message with a retry action. The error boundary MUST be a client component.

#### Scenario: Unhandled error in page
- **WHEN** an unhandled error occurs in any page component
- **THEN** the error boundary renders an error message and a button to retry

#### Scenario: Error recovery
- **WHEN** a user clicks the retry button on the error boundary
- **THEN** the error boundary attempts to re-render the page

### Requirement: Custom 404 page
The system SHALL provide a custom not-found page (`app/not-found.tsx`) that displays a styled 404 message with a link to navigate home.

#### Scenario: Navigate to non-existent route
- **WHEN** a user navigates to a URL that does not match any route
- **THEN** the system displays the custom 404 page with a link to the home page

### Requirement: Pipeline route loading states
The system SHALL provide `loading.tsx` files for pipeline routes (`app/pipelines/loading.tsx` and `app/pipelines/[id]/loading.tsx`) that display skeleton placeholders while page content loads.

#### Scenario: Pipeline list loading
- **WHEN** a user navigates to the pipelines list and data is being fetched on the server
- **THEN** a skeleton placeholder is displayed until the page content streams in

#### Scenario: Pipeline editor loading
- **WHEN** a user navigates to a pipeline editor page
- **THEN** a loading skeleton is displayed until the page component loads

### Requirement: Application metadata
The system SHALL set the root layout metadata to reflect the application name ("Pipevals") and description. Dynamic routes (`/pipelines/[id]`) SHALL use `generateMetadata` to include the pipeline name in the page title.

#### Scenario: Root page title
- **WHEN** a user opens any page
- **THEN** the browser tab displays "Pipevals" (or a page-specific suffix like "Pipevals - Pipelines")

#### Scenario: Pipeline editor page title
- **WHEN** a user opens a pipeline editor for a pipeline named "GPT-4o Eval"
- **THEN** the browser tab displays "GPT-4o Eval - Pipevals"
