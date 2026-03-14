import type { MetricCaptureConfig, StepHandler } from "../types";
import { resolveDotPath } from "../dot-path";

export const metricCaptureHandler: StepHandler<MetricCaptureConfig> = async (
  config,
  input,
) => {
  const context = { steps: input.steps, trigger: input.trigger };
  const value = resolveDotPath(context, config.extractPath);

  return {
    metric: config.metricName,
    value,
  };
};
