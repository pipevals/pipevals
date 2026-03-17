## ADDED Requirements

### Requirement: Slug generation from name
The system SHALL provide a `slugify` utility that converts a pipeline name into a URL-safe slug: lowercase, alphanumeric characters and hyphens only, runs of non-alphanumeric characters collapsed to a single hyphen, leading and trailing hyphens stripped. If the result is empty (e.g., input is all special characters), the utility MUST return a fallback derived from a short UUID segment.

#### Scenario: Normal name slugification
- **WHEN** `slugify("GPT-4o Eval")` is called
- **THEN** it returns `"gpt-4o-eval"`

#### Scenario: Name with spaces and special chars
- **WHEN** `slugify("My Pipeline!! (v2)")` is called
- **THEN** it returns `"my-pipeline-v2"`

#### Scenario: All-special-char name produces fallback
- **WHEN** `slugify("!!!")` is called
- **THEN** it returns a non-empty string (UUID-segment fallback)

### Requirement: Slug column on pipeline table
The pipeline table MUST include a `slug` column of type `text NOT NULL`. The column MUST have a unique index scoped to `(slug, organization_id)` named `pipeline_slug_org_uidx`. The existing `pipeline_name_org_uidx` unique index on `(name, organization_id)` MUST be removed.

#### Scenario: Slug stored on create
- **WHEN** a pipeline is created with name `"Accuracy Benchmark"`
- **THEN** the database row has a `slug` value of `"accuracy-benchmark"`

#### Scenario: Duplicate slug within org rejected at DB level
- **WHEN** two pipelines with the same slug are inserted into the same organization concurrently
- **THEN** the database rejects the second insert with a unique constraint violation

#### Scenario: Same slug in different orgs is allowed
- **WHEN** two pipelines in different organizations have the slug `"test-pipeline"`
- **THEN** both rows are accepted by the database

### Requirement: Slug collision error
The system MUST return a 409 error when a pipeline creation would produce a slug already used in the organization. The error is surfaced by catching the `pipeline_slug_org_uidx` constraint violation from the database.

#### Scenario: Duplicate slug returns 409
- **WHEN** a pipeline with slug `"eval"` already exists in the org and a new pipeline with the same derived slug is created
- **THEN** the system returns 409 with an error message
