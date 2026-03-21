import type { TransformConfig, StepHandler } from "../types";
import { resolveDotPath } from "@pipevals/workflow-walker";

export const transformHandler: StepHandler<TransformConfig> = async (
  config,
  input,
) => {
  "use step";
  const context = { steps: input.steps, trigger: input.trigger };
  const result: Record<string, unknown> = {};

  for (const [key, path] of Object.entries(config.mapping)) {
    result[key] = resolveDotPath(context, path);
  }

  return result;
};
