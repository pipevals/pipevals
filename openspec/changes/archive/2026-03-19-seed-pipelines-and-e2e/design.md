## Context

Pipevals has a fully functional pipeline builder, walker engine, and step registry. Users can create pipelines via the UI (drag-and-drop nodes, configure, save) or via the PUT API (full graph upsert). However, new users start with an empty pipeline list and no examples of what a real evaluation pipeline looks like.

The project has unit tests (via Bun) for pipeline logic (auto-wire, graph validation, dot-path resolution) but no integration or E2E tests that exercise the product through the browser.

## Goals / Non-Goals

**Goals:**
- Ship two seed pipelines that demonstrate the most common AI evaluation patterns
- Seed pipelines are inserted via a standalone script (runnable in dev and CI)
- Establish E2E test infrastructure using browser automation
- Two smoke tests: one per seed pipeline, verifying render + execution flow
- Seed data is idempotent — re-running the script skips existing pipelines

**Non-Goals:**
- Seed pipelines are not "templates" — there is no template system, gallery UI, or clone mechanism
- E2E tests do not cover pipeline editing (adding/removing nodes, rewiring)
- No automated CI integration for E2E tests in this change (manual run only)
- No new step types — seeds use existing `ai_sdk`, `metric_capture`, `condition`, `transform` steps

## Decisions

### 1. Seed mechanism: DB script vs API calls

**Decision**: Direct Drizzle DB inserts via a `scripts/seed-pipelines.ts` script.

**Alternatives considered**:
- *API calls*: Would require a valid auth session/cookie, making the script harder to run in CI and local dev. The API also requires sequential calls (create pipeline → PUT graph) with error handling for auth.
- *SQL migration*: Too rigid — seeds depend on a specific org existing, and migrations shouldn't contain application data.

**Rationale**: Direct DB access is the simplest path. The script accepts an `--org` flag (org ID or slug) to target a specific organization. It uses the same Drizzle schema types as the app, so the data shape is guaranteed correct. Inserts are wrapped in a transaction per pipeline.

### 2. Seed pipeline definitions: inline in script vs JSON fixtures

**Decision**: Define pipeline graphs as typed constants in the seed script itself.

**Alternatives considered**:
- *JSON fixture files*: Would need separate parsing/validation and wouldn't benefit from TypeScript type checking on node configs.

**Rationale**: The seed script is the only consumer. Keeping definitions inline means a single file to maintain, with full type safety on node configs matching the Zod schemas.

### 3. Node positioning: manual layout

**Decision**: Hardcode node positions for a clean left-to-right layout in the canvas.

**Rationale**: Auto-layout would require pulling in a layout library (dagre/elkjs). For two static pipelines with known topology, manual coordinates are simpler and produce a predictable result. Trigger at x=0, steps spaced ~300px apart horizontally, parallel branches offset ~200px vertically.

### 4. E2E approach: agent-browser

**Decision**: Use `agent-browser` CLI for E2E smoke tests.

**Alternatives considered**:
- *Playwright*: More conventional, but requires additional setup, page object models, and doesn't match the existing dev toolchain.
- *Cypress*: Heavy, requires its own runner, and the team already uses Bun for testing.

**Rationale**: `agent-browser` is already available in the user's environment and can be driven from test scripts. It can navigate pages, verify DOM elements, click buttons, and take screenshots — sufficient for smoke-level validation. Tests will be shell scripts or Bun test files that invoke `agent-browser` commands.

### 5. Idempotency strategy

**Decision**: Check if a pipeline with the seed slug already exists in the target org. If it does, skip that seed. Log which seeds were created vs skipped.

**Rationale**: Makes the script safe to run repeatedly in dev without duplicating data or erroring out. Uses the existing `pipeline_slug_org_uidx` unique index as the natural dedup key.

## Risks / Trade-offs

- **Seed pipelines can't actually execute without valid AI Gateway credentials** → E2E tests that verify *run execution* will need real API keys configured, or the tests should stop at "run triggered" and verify the UI shows the pending/running state rather than waiting for completion.
- **`agent-browser` is not a standard test framework** → Tests won't produce standard xUnit/TAP output. If CI integration is needed later, we may need to wrap them or migrate to Playwright. This is acceptable for now since E2E CI is a non-goal.
- **Seed data couples to current schema** → If node config shapes change, seeds break. Mitigation: seeds use the same Zod schemas for validation, so breakage is caught at script compile time rather than at runtime.
- **Hardcoded positions may not look great on all viewport sizes** → Acceptable for seed data. Users can rearrange nodes after.
