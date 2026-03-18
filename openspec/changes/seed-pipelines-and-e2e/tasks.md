## 1. Seed Script Foundation

- [x] 1.1 Create `scripts/seed-pipelines.ts` with CLI arg parsing (`--org`, `--user` flags) and DB connection setup using the app's Drizzle config
- [x] 1.2 Add idempotency logic: query for existing pipelines by slug+org before inserting, log skip/create outcomes

## 2. AI-as-a-Judge Pipeline Definition

- [ ] 2.1 Define the AI-as-a-Judge pipeline graph constant: 4 nodes (trigger, generator ai_sdk, judge ai_sdk, metric_capture) with configs matching Zod schemas, positioned in left-to-right layout
- [ ] 2.2 Write the judge prompt template with relevance/coherence criteria, 1-5 scoring scale, and structured JSON output instructions
- [ ] 2.3 Define 3 edges wiring trigger → generator → judge → metric_capture
- [ ] 2.4 Define trigger schema as `{ prompt: { type: "string" } }`

## 3. Model A/B Comparison Pipeline Definition

- [ ] 3.1 Define the Model A/B pipeline graph constant: 6 nodes (trigger, model_a ai_sdk, model_b ai_sdk, transform, judge ai_sdk, metric_capture) with configs matching Zod schemas
- [ ] 3.2 Position nodes in fork-converge diamond layout: trigger at left, model A/B branching vertically, converging at transform, then judge → metric_capture
- [ ] 3.3 Define 5 edges: trigger → model_a, trigger → model_b, model_a → transform, model_b → transform, transform → judge, judge → metric_capture
- [ ] 3.4 Write the comparison judge prompt with pairwise evaluation criteria and structured JSON output (winner, score_a, score_b, reasoning)
- [ ] 3.5 Configure transform node mapping to collect `response_a` and `response_b` from upstream outputs

## 4. Seed Script Insertion Logic

- [x] 4.1 Implement per-pipeline transaction: insert pipeline row, then batch-insert nodes, then batch-insert edges
- [x] 4.2 Resolve `--user` default: if not provided, query the first member of the org
- [ ] 4.3 Validate seed graphs against `validateGraph` at script startup (fail fast if definitions are invalid)

## 5. Unit Tests for Seed Definitions

- [ ] 5.1 Write Bun tests verifying each seed pipeline's node configs pass their respective Zod schemas
- [ ] 5.2 Write Bun tests verifying each seed pipeline's graph passes `validateGraph`

## 6. E2E Test Infrastructure

- [ ] 6.1 Create `tests/e2e/` directory with a README documenting prerequisites (dev server, seed script, auth)
- [ ] 6.2 Create an E2E test script for the pipeline list smoke test: sign in → verify both seed pipeline names appear in the list
- [ ] 6.3 Create an E2E test script for the canvas render smoke test: open AI-as-a-Judge pipeline → verify "Generator" and "Judge" nodes render on canvas
- [ ] 6.4 Create an E2E test script for the canvas render smoke test: open Model A/B pipeline → verify "Model A", "Model B", "Collect Responses", "Judge" nodes render
- [ ] 6.5 Create an E2E test script for the run trigger smoke test: open a pipeline → fill trigger input → click run → verify run appears in run list
