## Why

Pipevals has a working pipeline builder and execution engine, but new users land on an empty canvas with no guidance on what evaluation pipelines look like. Seed pipelines for the two most common AI evaluation patterns — AI-as-a-Judge scoring and Model A/B comparison — will demonstrate pipevals' value immediately and serve as reusable starting points. E2E tests that exercise these seeds through the browser will also establish the project's first integration-level test coverage.

## What Changes

- **Seed script**: A `scripts/seed-pipelines.ts` script that creates two pre-configured pipelines (with nodes, edges, trigger schemas) via direct DB inserts, scoped to the user's active organization.
- **AI-as-a-Judge pipeline**: Trigger → AI SDK (generator) → AI SDK (judge) → Metric Capture. Demonstrates the most common evaluation flow from Chip Huyen's *AI Engineering*: use one LLM to score another's output.
- **Model A/B Comparison pipeline**: Trigger → two parallel AI SDK steps (Model A, Model B) → AI SDK (judge comparing both) → Metric Capture. Demonstrates pairwise model comparison.
- **E2E test suite**: Browser-based tests using `agent-browser` that verify the full flow: sign in → see seed pipelines listed → open a pipeline → verify nodes render on canvas → trigger a run → see results.

## Capabilities

### New Capabilities
- `seed-pipelines`: Defines the seed script, seed pipeline definitions (graph shapes, configs, trigger schemas), and the mechanism for inserting them into a target org.
- `e2e-smoke-tests`: Defines the E2E test approach, browser automation patterns, and the two smoke test scenarios that validate seeded pipelines render and execute correctly.

### Modified Capabilities

_(none — this is additive, no existing spec behavior changes)_

## Impact

- **New files**: `scripts/seed-pipelines.ts`, `tests/e2e/` directory with test files
- **Dependencies**: `agent-browser` CLI for E2E (dev dependency or external tool)
- **Database**: Seed script inserts into `pipeline`, `pipeline_node`, `pipeline_edge` tables — idempotent (skips if slug already exists)
- **No API changes**: Seeds use direct DB access, not the API (avoids auth bootstrapping complexity in scripts)
