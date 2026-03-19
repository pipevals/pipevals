/**
 * E2E Smoke Test: Model A/B Comparison Canvas Render
 *
 * Verifies that opening the Model A/B Comparison pipeline renders the correct nodes.
 * Creates the pipeline from a template if it doesn't exist yet.
 */

import {
  AB_PIPELINE_NAME,
  navigateAuthenticated,
  ensurePipeline,
  ab_exec,
  fullSnapshot,
  assert,
  pass,
} from "./helpers";

await navigateAuthenticated("/pipelines");
ensurePipeline(AB_PIPELINE_NAME);

ab_exec(`find text "${AB_PIPELINE_NAME}" click`);
ab_exec("wait --load networkidle");

const snap = fullSnapshot();

const expectedNodes = ["Model A", "Model B", "Collect Responses", "Judge", "Metrics"];
for (const label of expectedNodes) {
  assert(snap.includes(label), `Node "${label}" is visible on canvas`);
}

pass("Model A/B Comparison Canvas Render");
