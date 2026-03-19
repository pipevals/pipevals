## MODIFIED Requirements

### Requirement: Seed script CLI interface
The system SHALL provide a script at `scripts/seed-templates.ts` runnable via `bun run scripts/seed-templates.ts` that:
- Requires no flags (built-in templates have `organizationId = NULL`)
- Connects to the database using the same configuration as the app
- Creates built-in templates inside a database transaction (per template)
- Is idempotent: skips templates whose slug already exists with `organizationId = NULL`
- Outputs which templates were created vs skipped to stdout

#### Scenario: Seed script creates built-in templates
- **WHEN** `bun run scripts/seed-templates.ts` is executed and no built-in templates exist
- **THEN** the script inserts 3 built-in templates (AI-as-a-Judge, Model A/B Comparison, Human-in-the-Loop Review) with `organizationId = NULL` and `createdBy = NULL`

#### Scenario: Seed script skips existing templates
- **WHEN** the seed script runs and a built-in template with slug `ai-as-a-judge-scoring` already exists
- **THEN** the script logs that it skipped "AI-as-a-Judge Scoring" and does not error

#### Scenario: Seed script no longer requires --org flag
- **WHEN** `bun run scripts/seed-templates.ts` is executed without any flags
- **THEN** the script runs successfully (built-in templates are not org-scoped)

## REMOVED Requirements

### Requirement: Seed script CLI interface
**Reason**: Replaced by `scripts/seed-templates.ts` which targets the `pipeline_template` table with `organizationId = NULL` instead of creating pipelines in a specific org.
**Migration**: Run `bun run scripts/seed-templates.ts` instead of `bun run scripts/seed-pipelines.ts --org <id>`. Existing pipelines created by the old seeder remain in the database unchanged.
