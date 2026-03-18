/**
 * E2E Smoke Test: Pipeline List
 *
 * Verifies that seed pipelines appear in the pipeline list after sign-in.
 *
 * Prerequisites:
 * - Dev server running at BASE_URL
 * - Seed pipelines inserted (bun run scripts/seed-pipelines.ts --org <slug>)
 * - Valid auth session (sign in via GitHub OAuth first)
 *
 * Usage:
 *   agent-browser --url $BASE_URL/pipelines --task "$(cat tests/e2e/pipeline-list.ts)"
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export const task = `
Navigate to ${BASE_URL}/pipelines.

If redirected to a sign-in page, sign in first, then navigate to /pipelines.

Once on the pipelines page, verify the following:

1. The page title or heading says "Pipelines"
2. A pipeline named "AI-as-a-Judge Scoring" appears in the list
3. A pipeline named "Model A/B Comparison" appears in the list

Take a screenshot of the pipeline list showing both seed pipelines.

Report PASS if both pipelines are visible, FAIL otherwise.
`;
