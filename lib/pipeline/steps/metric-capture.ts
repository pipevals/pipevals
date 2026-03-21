import type { MetricCaptureConfig, StepHandler } from "../types";
import { resolveDotPath } from "@pipevals/workflow-walker";

export const metricCaptureHandler: StepHandler<MetricCaptureConfig> = async (
  config,
  input,
) => {
  "use step";
  const context = { steps: input.steps, trigger: input.trigger };
  const result: Record<string, unknown> = {};

  for (const [name, path] of Object.entries(config.metrics)) {
    result[name] = resolveDotPath(context, path);
  }

  return { metrics: result };
};
