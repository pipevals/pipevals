/**
 * E2E Smoke Test: AI-as-a-Judge Canvas Render
 *
 * Verifies that opening the AI-as-a-Judge pipeline renders the correct nodes.
 * Creates the pipeline from a template if it doesn't exist yet.
 */

import {
  JUDGE_PIPELINE_NAME,
  BASE_URL,
  navigateAuthenticated,
  ensurePipeline,
  getPipelineId,
  ab_exec,
  fullSnapshot,
  assert,
  pass,
} from "./helpers";

await navigateAuthenticated("/pipelines");
ensurePipeline(JUDGE_PIPELINE_NAME);

// Navigate to the editor via direct URL to avoid ambiguous find text matches
const pipelineId = getPipelineId(JUDGE_PIPELINE_NAME);
ab_exec(`open ${BASE_URL}/pipelines/${pipelineId}`);
ab_exec("wait --load networkidle");
ab_exec("wait 2000");

const snap = fullSnapshot();

const expectedNodes = ["Generator", "Judge", "Metrics"];
for (const label of expectedNodes) {
  assert(snap.includes(label), `Node "${label}" is visible on canvas`);
}

pass("AI-as-a-Judge Canvas Render");
