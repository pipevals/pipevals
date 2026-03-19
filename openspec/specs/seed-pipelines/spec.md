## ADDED Requirements

### Requirement: AI-as-a-Judge seed pipeline definition
The system SHALL include a seed pipeline named "AI-as-a-Judge Scoring" with slug `ai-as-a-judge-scoring` containing exactly four nodes wired in sequence:
1. **Trigger** node with a trigger schema defining `{ prompt: string }`
2. **AI SDK** node labeled "Generator" configured with a model (e.g. `openai/gpt-4o`), a prompt template that incorporates `trigger.prompt`, and temperature 0.7
3. **AI SDK** node labeled "Judge" configured with a model (e.g. `openai/gpt-4o`), a prompt template that scores the generator's output on relevance and coherence using a 1-5 scale, temperature 0, and a response format requesting structured JSON with `score` and `reasoning` fields
4. **Metric Capture** node that captures `score` from the judge's structured output

The nodes SHALL be positioned in a left-to-right layout with ~300px horizontal spacing.

#### Scenario: Seed script creates AI-as-a-Judge pipeline
- **WHEN** the seed script runs against an organization that has no pipeline with slug `ai-as-a-judge-scoring`
- **THEN** a pipeline named "AI-as-a-Judge Scoring" is created with 4 nodes and 3 edges in the correct sequence

#### Scenario: Judge prompt includes scoring rubric
- **WHEN** the AI-as-a-Judge pipeline is inspected
- **THEN** the Judge node's prompt template SHALL include evaluation criteria (relevance, coherence), a 1-5 scoring scale, and instructions to output structured JSON

### Requirement: Model A/B Comparison seed pipeline definition
The system SHALL include a seed pipeline named "Model A/B Comparison" with slug `model-ab-comparison` containing exactly six nodes:
1. **Trigger** node with a trigger schema defining `{ prompt: string }`
2. **AI SDK** node labeled "Model A" configured with model `openai/gpt-4o` and a prompt template incorporating `trigger.prompt`
3. **AI SDK** node labeled "Model B" configured with model `anthropic/claude-sonnet-4-5-20250514` and a prompt template incorporating `trigger.prompt`
4. **Transform** node labeled "Collect Responses" that maps both model outputs into a single object with keys `response_a` and `response_b`
5. **AI SDK** node labeled "Judge" configured to compare both responses and output a structured verdict with `winner` (A or B), `score_a` (1-5), `score_b` (1-5), and `reasoning`
6. **Metric Capture** node that captures `score_a`, `score_b`, and `winner`

Model A and Model B nodes SHALL execute in parallel (both wired from trigger, converging at the transform). Nodes SHALL be positioned in a diamond/fork layout.

#### Scenario: Seed script creates Model A/B Comparison pipeline
- **WHEN** the seed script runs against an organization that has no pipeline with slug `model-ab-comparison`
- **THEN** a pipeline named "Model A/B Comparison" is created with 6 nodes and 6 edges, with Model A and Model B branching from trigger and converging at the transform node

#### Scenario: Parallel execution of models
- **WHEN** the Model A/B Comparison pipeline is examined
- **THEN** Model A and Model B nodes SHALL both have incoming edges from the trigger node (enabling parallel execution by the walker)

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

---

> **REMOVED:** The previous "Seed script CLI interface" requirement (targeting `scripts/seed-pipelines.ts` with `--org` flag) has been replaced.
> **Reason:** Replaced by `scripts/seed-templates.ts` which targets the `pipeline_template` table with `organizationId = NULL` instead of creating pipelines in a specific org.
> **Migration:** Run `bun run scripts/seed-templates.ts` instead of `bun run scripts/seed-pipelines.ts --org <id>`. Existing pipelines created by the old seeder remain in the database unchanged.

### Requirement: Seed pipeline graph validity
All seed pipelines SHALL pass the existing `validateGraph` function without errors. Node configs SHALL conform to their respective Zod schemas (`aiSdkConfigSchema`, `metricCaptureConfigSchema`, `transformConfigSchema`).

#### Scenario: Seed graphs are valid
- **WHEN** the seed pipeline node and edge data is passed to `validateGraph`
- **THEN** validation returns `{ valid: true }` with no errors
