/**
 * E2E Smoke Test: Pipeline Run Trigger
 *
 * Verifies that a pipeline run can be triggered from the UI and appears in the run list.
 *
 * Prerequisites:
 * - Dev server running at BASE_URL
 * - Seed pipelines inserted
 * - Valid auth session
 * - AI Gateway API keys configured (for actual execution, or just verify pending state)
 *
 * Usage:
 *   agent-browser --url $BASE_URL/pipelines --task "$(cat tests/e2e/run-trigger.ts)"
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export const task = `
Navigate to ${BASE_URL}/pipelines.

If redirected to a sign-in page, sign in first, then navigate to /pipelines.

Find and click on the pipeline named "AI-as-a-Judge Scoring" to open it.

Once the pipeline editor loads:

1. Look for a trigger input area or a "Run" button
2. If there is a prompt input field, enter: "Explain what makes a good API design"
3. Click the Run button to trigger a pipeline run
4. After triggering, navigate to the runs list for this pipeline (there may be a "Runs" tab or link)
5. Verify that a new run appears in the list with status "pending" or "running"

Take a screenshot showing the run in the list.

Report PASS if a run was created and appears in the list, FAIL otherwise.
Note: The run may fail if API keys are not configured — that's OK. We're only checking
that the run was created and shows up, not that it completed successfully.
`;
