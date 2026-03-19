import type { HumanReviewConfig, StepHandler } from "../types";

/**
 * Placeholder handler — human_review execution is handled at the workflow
 * level via defineHook/resumeHook, not through the standard executeNode path.
 */
export const humanReviewHandler: StepHandler<HumanReviewConfig> = async () => {
  throw new Error(
    "human_review steps must be executed at the workflow level, not via executeNode",
  );
};
