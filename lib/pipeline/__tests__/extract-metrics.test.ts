import { describe, expect, test } from "bun:test";
import { extractMetrics } from "../extract-metrics";

function makeRun(opts: {
  nodes: { id: string; type: string }[];
  stepResults: {
    nodeId: string;
    status: string;
    output?: Record<string, unknown> | null;
  }[];
}) {
  return {
    graphSnapshot: { nodes: opts.nodes },
    stepResults: opts.stepResults.map((sr) => ({
      nodeId: sr.nodeId,
      status: sr.status as "completed" | "failed" | "running" | "pending" | "skipped",
      output: sr.output ?? null,
    })),
  };
}

describe("extractMetrics", () => {
  test("extracts metrics from completed metric_capture nodes", () => {
    const run = makeRun({
      nodes: [
        { id: "n1", type: "transform" },
        { id: "m1", type: "metric_capture" },
        { id: "m2", type: "metric_capture" },
      ],
      stepResults: [
        { nodeId: "n1", status: "completed", output: { text: "hello" } },
        { nodeId: "m1", status: "completed", output: { metric: "accuracy", value: 0.85 } },
        { nodeId: "m2", status: "completed", output: { metric: "latency", value: 1200 } },
      ],
    });

    const metrics = extractMetrics(run);
    expect(metrics).toEqual([
      { name: "accuracy", value: 0.85 },
      { name: "latency", value: 1200 },
    ]);
  });

  test("returns empty array when no metric_capture nodes exist", () => {
    const run = makeRun({
      nodes: [{ id: "n1", type: "transform" }],
      stepResults: [
        { nodeId: "n1", status: "completed", output: { text: "hello" } },
      ],
    });

    expect(extractMetrics(run)).toEqual([]);
  });

  test("ignores non-completed metric_capture nodes", () => {
    const run = makeRun({
      nodes: [{ id: "m1", type: "metric_capture" }],
      stepResults: [
        { nodeId: "m1", status: "failed", output: null },
      ],
    });

    expect(extractMetrics(run)).toEqual([]);
  });

  test("ignores running and pending metric_capture nodes", () => {
    const run = makeRun({
      nodes: [
        { id: "m1", type: "metric_capture" },
        { id: "m2", type: "metric_capture" },
      ],
      stepResults: [
        { nodeId: "m1", status: "running" },
        { nodeId: "m2", status: "pending" },
      ],
    });

    expect(extractMetrics(run)).toEqual([]);
  });

  test("falls back to nodeId when output.metric is missing", () => {
    const run = makeRun({
      nodes: [{ id: "m1", type: "metric_capture" }],
      stepResults: [
        { nodeId: "m1", status: "completed", output: { value: 42 } },
      ],
    });

    const metrics = extractMetrics(run);
    expect(metrics).toEqual([{ name: "m1", value: 42 }]);
  });

  test("returns undefined value when output.value is missing", () => {
    const run = makeRun({
      nodes: [{ id: "m1", type: "metric_capture" }],
      stepResults: [
        { nodeId: "m1", status: "completed", output: { metric: "score" } },
      ],
    });

    const metrics = extractMetrics(run);
    expect(metrics).toEqual([{ name: "score", value: undefined }]);
  });

  test("ignores completed non-metric nodes", () => {
    const run = makeRun({
      nodes: [
        { id: "n1", type: "transform" },
        { id: "n2", type: "ai_sdk" },
        { id: "m1", type: "metric_capture" },
      ],
      stepResults: [
        { nodeId: "n1", status: "completed", output: { result: "ok" } },
        { nodeId: "n2", status: "completed", output: { text: "hello" } },
        { nodeId: "m1", status: "completed", output: { metric: "accuracy", value: 0.9 } },
      ],
    });

    const metrics = extractMetrics(run);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe("accuracy");
  });

  test("handles metric_capture node with no step result", () => {
    const run = makeRun({
      nodes: [{ id: "m1", type: "metric_capture" }],
      stepResults: [],
    });

    expect(extractMetrics(run)).toEqual([]);
  });

  test("handles null output on completed metric_capture", () => {
    const run = makeRun({
      nodes: [{ id: "m1", type: "metric_capture" }],
      stepResults: [
        { nodeId: "m1", status: "completed", output: null },
      ],
    });

    const metrics = extractMetrics(run);
    expect(metrics).toEqual([{ name: "m1", value: undefined }]);
  });
});
