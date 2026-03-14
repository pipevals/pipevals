import type { StepType, StepHandler } from "../types";
import { apiRequestHandler } from "./api-request";
import { aiSdkHandler } from "./ai-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepRegistry: Record<StepType, StepHandler<any>> = {
  api_request: apiRequestHandler,
  ai_sdk: aiSdkHandler,
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
