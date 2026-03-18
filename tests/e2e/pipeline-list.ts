/**
 * E2E Smoke Test: Pipeline List
 *
 * Verifies that seed pipelines appear in the pipeline list.
 */

import {
  JUDGE_PIPELINE_NAME,
  AB_PIPELINE_NAME,
  navigateAuthenticated,
  snapshot,
  assert,
  pass,
} from "./helpers";

await navigateAuthenticated("/pipelines");

const snap = snapshot();

assert(snap.includes("New Pipeline"), "Pipeline list page loaded (New Pipeline button visible)");
assert(snap.includes(JUDGE_PIPELINE_NAME), `"${JUDGE_PIPELINE_NAME}" appears in the list`);
assert(snap.includes(AB_PIPELINE_NAME), `"${AB_PIPELINE_NAME}" appears in the list`);

pass("Pipeline List");
