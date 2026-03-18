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
- **THEN** a pipeline named "Model A/B Comparison" is created with 6 nodes and 5 edges, with Model A and Model B branching from trigger and converging at the transform node

#### Scenario: Parallel execution of models
- **WHEN** the Model A/B Comparison pipeline is examined
- **THEN** Model A and Model B nodes SHALL both have incoming edges from the trigger node (enabling parallel execution by the walker)

### Requirement: Seed script CLI interface
The system SHALL provide a script at `scripts/seed-pipelines.ts` runnable via `bun run scripts/seed-pipelines.ts` that:
- Accepts a `--org <id-or-slug>` flag to specify the target organization
- Accepts an optional `--user <id>` flag for the `created_by` field (defaults to the first member of the org)
- Connects to the database using the same configuration as the app
- Creates seed pipelines inside a database transaction (per pipeline)
- Outputs which pipelines were created vs skipped to stdout

#### Scenario: Seed script with org flag
- **WHEN** `bun run scripts/seed-pipelines.ts --org my-org-id` is executed
- **THEN** the script inserts seed pipelines into the organization with that ID

#### Scenario: Seed script skips existing pipelines
- **WHEN** the seed script runs and a pipeline with slug `ai-as-a-judge-scoring` already exists in the target org
- **THEN** the script logs that it skipped "AI-as-a-Judge Scoring" and does not error

#### Scenario: Seed script with missing org
- **WHEN** the seed script runs without the `--org` flag
- **THEN** the script exits with an error message indicating the flag is required

### Requirement: Seed pipeline graph validity
All seed pipelines SHALL pass the existing `validateGraph` function without errors. Node configs SHALL conform to their respective Zod schemas (`aiSdkConfigSchema`, `metricCaptureConfigSchema`, `transformConfigSchema`).

#### Scenario: Seed graphs are valid
- **WHEN** the seed pipeline node and edge data is passed to `validateGraph`
- **THEN** validation returns `{ valid: true }` with no errors
