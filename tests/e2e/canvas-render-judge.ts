/**
 * E2E Smoke Test: AI-as-a-Judge Canvas Render
 *
 * Verifies that opening the AI-as-a-Judge pipeline renders the correct nodes.
 *
 * Prerequisites:
 * - Dev server running at BASE_URL
 * - Seed pipelines inserted
 * - Valid auth session
 *
 * Usage:
 *   agent-browser --url $BASE_URL/pipelines --task "$(cat tests/e2e/canvas-render-judge.ts)"
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export const task = `
Navigate to ${BASE_URL}/pipelines.

If redirected to a sign-in page, sign in first, then navigate to /pipelines.

Find and click on the pipeline named "AI-as-a-Judge Scoring" to open it.

Once the pipeline editor/canvas loads, verify the following nodes are visible:

1. A node labeled "Trigger"
2. A node labeled "Generator"
3. A node labeled "Judge"
4. A node labeled "Metrics"

The nodes should be connected by edges in sequence: Trigger → Generator → Judge → Metrics.

Take a screenshot of the canvas showing all nodes.

Report PASS if all 4 nodes are visible on the canvas, FAIL otherwise.
`;
