import type { TransformConfig, StepHandler } from "../types";
import { resolveDotPath } from "../dot-path";

export const transformHandler: StepHandler<TransformConfig> = async (
  config,
  input,
) => {
  const context = { steps: input.steps, trigger: input.trigger };
  const result: Record<string, unknown> = {};

  for (const [key, path] of Object.entries(config.mapping)) {
    result[key] = resolveDotPath(context, path);
  }

  return result;
};
