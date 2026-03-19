import { describe, expect, test } from "bun:test";
import { aggregateReviews } from "../../walker/human-review";
import type { HumanReviewConfig } from "../../types";
import type { ReviewHookPayload } from "../../walker/review-hook";

const config: HumanReviewConfig = {
  type: "human_review",
  display: {},
  rubric: [
    { name: "accuracy", type: "rating", min: 1, max: 5 },
    { name: "tone", type: "rating", min: 1, max: 5 },
    { name: "notes", type: "text" },
  ],
  requiredReviewers: 1,
};

function review(
  index: number,
  scores: Record<string, unknown>,
): ReviewHookPayload {
  return { reviewerId: `user_${index}`, reviewerIndex: index, scores };
}

describe("aggregateReviews", () => {
  test("single reviewer: scores pass through as-is", () => {
    const result = aggregateReviews(
      [review(0, { accuracy: 4, tone: 3 })],
      config,
    );
    expect(result.scores).toEqual({ accuracy: 4, tone: 3 });
    expect((result.reviews as unknown[]).length).toBe(1);
  });

  test("multiple reviewers: computes mean for rating fields", () => {
    const result = aggregateReviews(
      [
        review(0, { accuracy: 4, tone: 3 }),
        review(1, { accuracy: 5, tone: 4 }),
        review(2, { accuracy: 3, tone: 5 }),
      ],
      config,
    );
    expect(result.scores).toEqual({ accuracy: 4, tone: 4 });
  });

  test("two reviewers: fractional mean", () => {
    const result = aggregateReviews(
      [
        review(0, { accuracy: 4, tone: 3 }),
        review(1, { accuracy: 5, tone: 4 }),
      ],
      config,
    );
    expect(result.scores).toEqual({ accuracy: 4.5, tone: 3.5 });
  });

  test("preserves individual reviews in output", () => {
    const reviews = [
      review(0, { accuracy: 4, tone: 3 }),
      review(1, { accuracy: 5, tone: 4 }),
    ];
    const result = aggregateReviews(reviews, config);
    const outputReviews = result.reviews as Array<{
      reviewerId: string;
      reviewerIndex: number;
      scores: Record<string, unknown>;
    }>;
    expect(outputReviews).toHaveLength(2);
    expect(outputReviews[0].reviewerId).toBe("user_0");
    expect(outputReviews[0].scores).toEqual({ accuracy: 4, tone: 3 });
    expect(outputReviews[1].reviewerId).toBe("user_1");
    expect(outputReviews[1].reviewerIndex).toBe(1);
  });

  test("non-rating fields are not aggregated in scores", () => {
    const result = aggregateReviews(
      [review(0, { accuracy: 4, tone: 3, notes: "Good" })],
      config,
    );
    // notes is a text field, should not appear in scores
    expect(result.scores).toEqual({ accuracy: 4, tone: 3 });
  });

  test("empty reviews: empty scores", () => {
    const result = aggregateReviews([], config);
    expect(result.scores).toEqual({});
    expect(result.reviews).toEqual([]);
  });

  test("config with no rating fields: empty scores", () => {
    const textOnlyConfig: HumanReviewConfig = {
      type: "human_review",
      display: {},
      rubric: [{ name: "notes", type: "text" }],
      requiredReviewers: 1,
    };
    const result = aggregateReviews(
      [review(0, { notes: "Looks great" })],
      textOnlyConfig,
    );
    expect(result.scores).toEqual({});
  });
});
