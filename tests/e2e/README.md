# E2E Smoke Tests

Browser-based smoke tests that verify pipevals works end-to-end using `agent-browser`.

## Prerequisites

1. **Dev server running**: `bun run dev` (default: http://localhost:3000)
2. **Database seeded**: `bun run db:seed` then `bun run scripts/seed-pipelines.ts --org <org-slug>`
3. **`agent-browser` installed**: `brew install agent-browser` or `npm install -g agent-browser`

## Auth

In dev, email/password auth is automatically enabled. The seed script creates a demo user (`demo@pipe.evals` / `pipevals-dev`). Tests sign in programmatically via the Better Auth API when they detect the sign-in page — no manual setup needed.

In production, email/password is disabled and only GitHub OAuth is available.

## Running

```bash
# Defaults: BASE_URL=http://localhost:3000, standalone browser profile
bun run tests/e2e/pipeline-list.ts
bun run tests/e2e/canvas-render-judge.ts
bun run tests/e2e/canvas-render-ab.ts
bun run tests/e2e/run-trigger.ts

# All smoke tests
for f in tests/e2e/pipeline-list.ts tests/e2e/canvas-render-judge.ts tests/e2e/canvas-render-ab.ts tests/e2e/run-trigger.ts; do
  echo "--- $f ---"
  bun run "$f" || exit 1
done
```

### Browser connection options

| Env var | What it does |
|---------|-------------|
| `E2E_CDP=9222` | Connect to a running Chrome with `--remote-debugging-port=9222` |
| `E2E_AUTO_CONNECT=1` | Auto-discover any running Chrome with debugging enabled |
| `E2E_PROFILE=~/.foo` | Use a persistent browser profile (default: `~/.pipevals-e2e`) |
| _(none)_ | Launch a standalone browser with the default profile |

Each test exits with code 0 on PASS, 1 on FAIL.

## What these tests verify

| Test | What it checks |
|------|---------------|
| `pipeline-list.ts` | Seed pipelines appear in the pipeline list |
| `canvas-render-judge.ts` | AI-as-a-Judge pipeline renders correct nodes on canvas |
| `canvas-render-ab.ts` | Model A/B pipeline renders correct nodes on canvas |
| `run-trigger.ts` | A pipeline run can be triggered and appears in the run list |
