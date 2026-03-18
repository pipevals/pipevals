/**
 * E2E Smoke Test: Pipeline Run Trigger
 *
 * Verifies that a pipeline run can be triggered and appears in the run list.
 * Uses the AI-as-a-Judge pipeline — it has the simplest trigger schema
 * (single "prompt" field).
 *
 * Note: The run may fail if AI Gateway API keys are not configured —
 * this test only checks that the run is created, not that it completes.
 */

import {
  JUDGE_PIPELINE_NAME,
  navigateAuthenticated,
  ab_exec,
  snapshot,
  assert,
  pass,
} from "./helpers";

// Navigate to the pipeline list, then into the Judge pipeline's runs page
await navigateAuthenticated("/pipelines");
ab_exec(`find text "${JUDGE_PIPELINE_NAME}" click`);
ab_exec("wait --load networkidle");
ab_exec('find text "Test Run" click');
ab_exec("wait --load networkidle");

// Trigger a run
ab_exec('find text "Trigger Run" click');
ab_exec("wait 2000");

// Check for run status in the table
const snap = snapshot();
const hasRunStatus =
  snap.includes("Pending") ||
  snap.includes("Running") ||
  snap.includes("Completed") ||
  snap.includes("Failed");

assert(hasRunStatus, "A run appeared with a status indicator");

pass("Pipeline Run Trigger");
