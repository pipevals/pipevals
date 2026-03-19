/**
 * E2E Smoke Test: AI-as-a-Judge Canvas Render
 *
 * Verifies that opening the AI-as-a-Judge pipeline renders the correct nodes.
 * Creates the pipeline from a template if it doesn't exist yet.
 */

import {
  JUDGE_PIPELINE_NAME,
  navigateAuthenticated,
  ensurePipeline,
  ab_exec,
  fullSnapshot,
  assert,
  pass,
} from "./helpers";

await navigateAuthenticated("/pipelines");
ensurePipeline(JUDGE_PIPELINE_NAME);

ab_exec(`find text "${JUDGE_PIPELINE_NAME}" click`);
ab_exec("wait --load networkidle");

const snap = fullSnapshot();

const expectedNodes = ["Generator", "Judge", "Metrics"];
for (const label of expectedNodes) {
  assert(snap.includes(label), `Node "${label}" is visible on canvas`);
}

pass("AI-as-a-Judge Canvas Render");
