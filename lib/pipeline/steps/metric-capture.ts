import type { MetricCaptureConfig, StepHandler } from "../types";
import { resolveDotPath } from "../dot-path";

export const metricCaptureHandler: StepHandler<MetricCaptureConfig> = async (
  config,
  input,
) => {
  const context = { steps: input.steps, trigger: input.trigger };
  const result: Record<string, unknown> = {};

  for (const [name, path] of Object.entries(config.metrics)) {
    result[name] = resolveDotPath(context, path);
  }

  return { metrics: result };
};
