### Requirement: Template picker in new pipeline flow
The "New Pipeline" creation UI SHALL display a list of available templates (built-in and org-scoped) before the name input. Each template card SHALL show the template name and description. The user SHALL be able to select a template or choose "Start from scratch". The selected template's ID SHALL be submitted alongside the pipeline name when creating.

#### Scenario: User creates pipeline from template
- **WHEN** a user clicks "New Pipeline", selects the "AI-as-a-Judge Scoring" template, enters name "My First Eval", and clicks Create
- **THEN** the system creates a pipeline named "My First Eval" pre-populated with the template's graph

#### Scenario: User creates pipeline from scratch
- **WHEN** a user clicks "New Pipeline", selects "Start from scratch", enters a name, and clicks Create
- **THEN** the system creates an empty pipeline (no template applied)

### Requirement: Template empty state on pipelines page
When the user has no pipelines, the empty state on `/pipelines` SHALL prominently display available templates with a call-to-action to create a pipeline from one. The empty state SHALL also offer a "Start from scratch" option.

#### Scenario: Empty state shows templates
- **WHEN** an authenticated user visits `/pipelines` with no pipelines in their org
- **THEN** the page displays template cards for all available templates (built-in + org-scoped) and a "Start from scratch" option

#### Scenario: Empty state with search hides templates
- **WHEN** an authenticated user has pipelines, types a search query, and no results match
- **THEN** the empty state shows "No pipelines match your search" without template cards (templates are only shown when there are zero pipelines total)

### Requirement: Built-in vs org-scoped template distinction
The template picker SHALL visually distinguish built-in templates from org-scoped templates. Built-in templates SHALL be labeled or grouped to indicate they are system-provided.

#### Scenario: Visual distinction in template list
- **WHEN** the template picker displays both built-in and org-scoped templates
- **THEN** built-in templates are visually distinguishable from org-scoped templates
