/**
 * E2E Smoke Test: Pipeline Run Trigger
 *
 * Creates a pipeline from the AI-as-a-Judge template if it doesn't exist,
 * then triggers a run and verifies it appears in the list.
 *
 * Note: The run may fail if AI Gateway API keys are not configured —
 * this test only checks that the run is created, not that it completes.
 */

import {
  JUDGE_PIPELINE_NAME,
  BASE_URL,
  navigateAuthenticated,
  ensurePipeline,
  ab_exec,
  ab_run,
  snapshot,
  assert,
  pass,
} from "./helpers";

// Navigate to the pipeline list and ensure the Judge pipeline exists
await navigateAuthenticated("/pipelines");
const snap = ensurePipeline(JUDGE_PIPELINE_NAME);

// Extract pipeline ID from the snapshot text (contains POST /api/pipelines/<uuid>/runs)
const idMatch = snap.match(/\/api\/pipelines\/([0-9a-f-]+)\/runs/);
assert(!!idMatch, "Pipeline ID found in snapshot");
const pipelineId = idMatch![1];

// Navigate directly to the runs page
ab_exec(`open ${BASE_URL}/pipelines/${pipelineId}/runs`);
ab_exec("wait --load networkidle");

let runsSnap = snapshot();
assert(runsSnap.includes("Trigger Run"), "Runs page loaded (Trigger Run button visible)");

// Open the trigger dialog, fill the prompt, and submit
ab_exec('find text "Trigger Run" click');
ab_exec("wait 1000");

// Find the payload textarea by ref and fill it with a real prompt
const dialogSnap = ab_run("snapshot -i");
const textboxMatch = dialogSnap.match(/textbox "JSON payload" \[ref=(\w+)\]/);
assert(!!textboxMatch, "Trigger dialog opened (JSON payload field visible)");
const textboxRef = textboxMatch![1];

ab_exec(`fill @${textboxRef} '{"prompt": "Explain the theory of relativity in simple terms"}'`);
ab_exec("wait 500");
ab_exec('find role button click --name "Trigger"');
ab_exec("wait --load networkidle");
ab_exec("wait 3000");

// Check for run status in the table
runsSnap = snapshot();
const hasRunStatus =
  runsSnap.includes("Pending") ||
  runsSnap.includes("Running") ||
  runsSnap.includes("Completed") ||
  runsSnap.includes("Failed") ||
  runsSnap.includes("Awaiting");

assert(hasRunStatus, "A run appeared with a status indicator");

pass("Pipeline Run Trigger");
