## ADDED Requirements

### Requirement: App header
The system SHALL render a persistent `AppHeader` component at the top of all authenticated pages. The header MUST display the app logo and name ("Pipevals"), navigation links to the Dashboard and Pipelines pages, and a user profile dropdown. The `AppHeader` component MUST be a client component.

#### Scenario: Header visible on all pages
- **WHEN** a user navigates to any authenticated page (pipelines list, pipeline builder, run history)
- **THEN** the app header is rendered at the top with the logo, nav links, and user avatar

#### Scenario: User dropdown
- **WHEN** a user clicks their avatar in the header
- **THEN** a dropdown menu opens showing the user's name, email, a theme toggle, and a sign-out action

### Requirement: Theme switching
The system SHALL support light and dark themes. Theme state MUST be managed via `next-themes` using the `ThemeProvider` component. The `ThemeProvider` MUST wrap the root layout. The default theme MUST be `system`. The theme toggle MUST be accessible from the user dropdown in the app header.

#### Scenario: System theme on first load
- **WHEN** a user visits the app for the first time with no saved theme preference
- **THEN** the app renders in the user's OS-preferred color scheme

#### Scenario: Manual theme override
- **WHEN** a user selects "Light" or "Dark" from the theme toggle
- **THEN** the theme switches immediately and the preference is persisted across page reloads

#### Scenario: No flash on load
- **WHEN** a user has a saved dark theme preference and reloads the page
- **THEN** the page does not flash white before applying the dark theme (next-themes handles this via suppressHydrationWarning)

### Requirement: shadcn/ui component library
The system SHALL use shadcn/ui as the base component library, built on Radix UI primitives with Tailwind CSS. All interactive UI primitives (dialogs, dropdowns, tables, breadcrumbs) MUST be sourced from the shadcn registry and placed under `components/ui/`. Custom application components MAY compose these primitives but MUST NOT re-implement them from scratch.

#### Scenario: Delete confirmation dialog
- **WHEN** a user clicks "Delete" on a pipeline
- **THEN** an `AlertDialog` from `components/ui/alert-dialog.tsx` opens asking for confirmation before the delete is executed

#### Scenario: Navigation breadcrumbs
- **WHEN** a user is on the run history page or the pipeline builder
- **THEN** a `Breadcrumb` component from `components/ui/breadcrumb.tsx` renders the current location in the hierarchy (e.g. Pipelines > Pipeline Name > Runs)
