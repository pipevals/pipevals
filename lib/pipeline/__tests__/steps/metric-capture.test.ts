import { describe, expect, test } from "bun:test";
import { metricCaptureHandler } from "../../steps/metric-capture";
import type { MetricCaptureConfig, StepInput } from "../../types";

describe("metricCaptureHandler", () => {
  test("extracts value at dot-path and returns metric name", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metricName: "accuracy",
      extractPath: "steps.scorer.score",
    };
    const input: StepInput = {
      steps: { scorer: { score: 0.85 } },
      trigger: {},
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metric: "accuracy", value: 0.85 });
  });

  test("extracts string value", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metricName: "model_used",
      extractPath: "steps.llm.model",
    };
    const input: StepInput = {
      steps: { llm: { model: "anthropic/claude-sonnet-4.5" } },
      trigger: {},
    };

    const result = await metricCaptureHandler(config, input);
    expect(result).toEqual({ metric: "model_used", value: "anthropic/claude-sonnet-4.5" });
  });

  test("fails on unresolvable path", async () => {
    const config: MetricCaptureConfig = {
      type: "metric_capture",
      metricName: "missing",
      extractPath: "steps.nonexistent.value",
    };
    const input: StepInput = { steps: {}, trigger: {} };

    await expect(metricCaptureHandler(config, input)).rejects.toThrow("Cannot resolve dot-path");
  });
});
