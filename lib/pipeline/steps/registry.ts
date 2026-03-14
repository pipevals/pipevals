import type { StepType, StepHandler } from "../types";
import { apiRequestHandler } from "./api-request";
import { aiSdkHandler } from "./ai-sdk";
import { sandboxHandler } from "./sandbox";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { metricCaptureHandler } from "./metric-capture";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepRegistry: Record<StepType, StepHandler<any>> = {
  api_request: apiRequestHandler,
  ai_sdk: aiSdkHandler,
  sandbox: sandboxHandler,
  condition: conditionHandler,
  transform: transformHandler,
  metric_capture: metricCaptureHandler,
};
