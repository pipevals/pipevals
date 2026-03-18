# E2E Smoke Tests

Browser-based smoke tests that verify pipevals works end-to-end using `agent-browser`.

## Prerequisites

1. **Dev server running**: `bun run dev` (default: http://localhost:3000)
2. **Database seeded**: `bun run db:seed` then `bun run scripts/seed-pipelines.ts --org <org-slug>`
3. **Auth session**: Tests require a signed-in user. The test scripts handle sign-in via the UI.
4. **`agent-browser` available**: Install from https://github.com/anthropics/agent-browser

## Running

Each test is a standalone script:

```bash
# Pipeline list visibility
bun run tests/e2e/pipeline-list.ts

# Canvas rendering
bun run tests/e2e/canvas-render-judge.ts
bun run tests/e2e/canvas-render-ab.ts

# Run trigger
bun run tests/e2e/run-trigger.ts
```

## What these tests verify

| Test | What it checks |
|------|---------------|
| `pipeline-list.ts` | Seed pipelines appear in the pipeline list after sign-in |
| `canvas-render-judge.ts` | AI-as-a-Judge pipeline renders correct nodes on canvas |
| `canvas-render-ab.ts` | Model A/B pipeline renders correct nodes on canvas |
| `run-trigger.ts` | A pipeline run can be triggered and appears in the run list |
