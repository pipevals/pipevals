/**
 * E2E Smoke Test: Pipeline List
 *
 * Verifies that the pipelines page loads and shows either existing
 * pipelines or template cards in the empty state.
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

// Template names appear either as pipelines in the list or as template
// cards in the empty state — both use the same seed definition names.
assert(
  snap.includes(JUDGE_PIPELINE_NAME),
  `"${JUDGE_PIPELINE_NAME}" appears (as pipeline or template)`,
);
assert(
  snap.includes(AB_PIPELINE_NAME),
  `"${AB_PIPELINE_NAME}" appears (as pipeline or template)`,
);

pass("Pipeline List");
