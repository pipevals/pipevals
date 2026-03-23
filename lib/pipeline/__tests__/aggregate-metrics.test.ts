import { describe, expect, test } from "bun:test";
import { aggregateMetrics } from "@/lib/pipeline/types/metrics";

describe("aggregateMetrics", () => {
  test("computes mean of numeric metrics across completed entries", () => {
    const entries = [
      { status: "completed", metrics: { accuracy: 0.8, latency: 100 } },
      { status: "completed", metrics: { accuracy: 0.6, latency: 200 } },
    ];
    const result = aggregateMetrics(entries);
    expect(result.accuracy).toBeCloseTo(0.7);
    expect(result.latency).toBeCloseTo(150);
  });

  test("skips non-completed entries", () => {
    const entries = [
      { status: "completed", metrics: { score: 10 } },
      { status: "failed", metrics: { score: 0 } },
      { status: "running", metrics: { score: 5 } },
    ];
    const result = aggregateMetrics(entries);
    expect(result.score).toBe(10);
  });

  test("returns empty object when no completed entries", () => {
    const entries = [
      { status: "failed", metrics: { score: 0 } },
      { status: "pending", metrics: {} },
    ];
    expect(aggregateMetrics(entries)).toEqual({});
  });

  test("returns empty object for empty input", () => {
    expect(aggregateMetrics([])).toEqual({});
  });

  test("ignores non-numeric metric values", () => {
    const entries = [
      { status: "completed", metrics: { score: 5, label: "good" as unknown } },
    ];
    const result = aggregateMetrics(entries);
    expect(result.score).toBe(5);
    expect(result).not.toHaveProperty("label");
  });

  test("handles entries with different metric keys", () => {
    const entries = [
      { status: "completed", metrics: { accuracy: 0.9 } },
      { status: "completed", metrics: { accuracy: 0.7, f1: 0.8 } },
    ];
    const result = aggregateMetrics(entries);
    expect(result.accuracy).toBeCloseTo(0.8);
    expect(result.f1).toBe(0.8); // only one entry had f1
  });
});
