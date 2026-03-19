import { defineHook } from "workflow";

/** Payload delivered by POST /api/tasks/[id]/submit via resumeHook. */
export interface ReviewHookPayload {
  reviewerId: string;
  reviewerIndex: number;
  scores: Record<string, unknown>;
}

/**
 * Workflow-level hook for human review submissions.
 * Each task creates its own instance via `reviewHook.create({ token })`.
 * The workflow suspends on `await hook` until `resumeHook(token, payload)` is called.
 */
export const reviewHook = defineHook<ReviewHookPayload>();
