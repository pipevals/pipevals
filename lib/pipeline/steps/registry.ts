import type { StepType, StepHandler } from "../types";

export const stepRegistry: Record<StepType, StepHandler> = {
  api_request: () => {
    throw new Error("api_request handler not implemented");
  },
  ai_sdk: () => {
    throw new Error("ai_sdk handler not implemented");
  },
  sandbox: () => {
    throw new Error("sandbox handler not implemented");
  },
  condition: () => {
    throw new Error("condition handler not implemented");
  },
  transform: () => {
    throw new Error("transform handler not implemented");
  },
  metric_capture: () => {
    throw new Error("metric_capture handler not implemented");
  },
};
