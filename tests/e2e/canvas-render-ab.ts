/**
 * E2E Smoke Test: Model A/B Comparison Canvas Render
 *
 * Verifies that opening the Model A/B Comparison pipeline renders the correct nodes.
 *
 * Prerequisites:
 * - Dev server running at BASE_URL
 * - Seed pipelines inserted
 * - Valid auth session
 *
 * Usage:
 *   agent-browser --url $BASE_URL/pipelines --task "$(cat tests/e2e/canvas-render-ab.ts)"
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export const task = `
Navigate to ${BASE_URL}/pipelines.

If redirected to a sign-in page, sign in first, then navigate to /pipelines.

Find and click on the pipeline named "Model A/B Comparison" to open it.

Once the pipeline editor/canvas loads, verify the following nodes are visible:

1. A node labeled "Trigger"
2. A node labeled "Model A"
3. A node labeled "Model B"
4. A node labeled "Collect Responses"
5. A node labeled "Judge"
6. A node labeled "Metrics"

Model A and Model B should branch from the Trigger and converge at Collect Responses,
forming a diamond/fork layout.

Take a screenshot of the canvas showing all nodes.

Report PASS if all 6 nodes are visible on the canvas, FAIL otherwise.
`;
