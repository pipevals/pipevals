/**
 * E2E Smoke Test: Pipeline List
 *
 * Verifies that the pipelines page loads and both seed pipelines are
 * present — creating them from templates if needed.
 */

import {
  JUDGE_PIPELINE_NAME,
  AB_PIPELINE_NAME,
  navigateAuthenticated,
  ensurePipeline,
  snapshot,
  assert,
  pass,
} from "./helpers";

await navigateAuthenticated("/pipelines");

const snap = snapshot();
assert(snap.includes("New Pipeline"), "Pipeline list page loaded (New Pipeline button visible)");

ensurePipeline(JUDGE_PIPELINE_NAME);
ensurePipeline(AB_PIPELINE_NAME);

const finalSnap = snapshot();
assert(
  finalSnap.includes(JUDGE_PIPELINE_NAME),
  `"${JUDGE_PIPELINE_NAME}" appears in the pipeline list`,
);
assert(
  finalSnap.includes(AB_PIPELINE_NAME),
  `"${AB_PIPELINE_NAME}" appears in the pipeline list`,
);

pass("Pipeline List");
