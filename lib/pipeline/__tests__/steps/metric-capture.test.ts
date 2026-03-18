import { describe, expect, test } from "bun:test";
import { metricCaptureHandler } from "../../steps/metric-capture";
import type { MetricCaptureConfig, StepInput } from "../../types";

describe("metricCaptureHandler", () => {
  test("captures a single metric", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: { accuracy: "steps.scorer.score" },
    };
    const input: StepInput = {
      steps: { scorer: { score: 0.85 } },
      trigger: {},
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metrics: { accuracy: 0.85 } });
  });

  test("captures multiple metrics in one step", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: {
        accuracy: "steps.scorer.score",
        latency: "steps.llm.latencyMs",
      },
    };
    const input: StepInput = {
      steps: {
        scorer: { score: 0.85 },
        llm: { latencyMs: 1200 },
      },
      trigger: {},
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metrics: { accuracy: 0.85, latency: 1200 } });
  });

  test("captures a string value", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: { model_used: "steps.llm.model" },
    };
    const input: StepInput = {
      steps: { llm: { model: "anthropic/claude-sonnet-4.5" } },
      trigger: {},
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metrics: { model_used: "anthropic/claude-sonnet-4.5" } });
  });

  test("captures a trigger value", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: { input_prompt: "trigger.prompt" },
    };
    const input: StepInput = {
      steps: {},
      trigger: { prompt: "hello world" },
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metrics: { input_prompt: "hello world" } });
  });

  test("returns empty metrics object when metrics map is empty", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: {},
    };
    const input: StepInput = { steps: {}, trigger: {} };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metrics: {} });
  });

  test("fails on unresolvable path", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metrics: { missing: "steps.nonexistent.value" },
    };
    const input: StepInput = { steps: {}, trigger: {} };

    await expect(metricCaptureHandler(config, input)).rejects.toThrow("Cannot resolve dot-path");
  });
});
