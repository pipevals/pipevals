import type { StepType, StepDefinition } from "../types";
import { apiRequestHandler } from "./api-request";
import { aiSdkHandler } from "./ai-sdk";
import { sandboxHandler } from "./sandbox";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { metricCaptureHandler } from "./metric-capture";
import { humanReviewHandler } from "./human-review";
import { portRegistry } from "./ports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepRegistry: Record<StepType, StepDefinition<any>> = {
  ai_sdk: {
    handler: aiSdkHandler,
    ports: portRegistry.ai_sdk,
  },

  api_request: {
    handler: apiRequestHandler,
    ports: portRegistry.api_request,
  },

  sandbox: {
    handler: sandboxHandler,
    ports: portRegistry.sandbox,
  },

  condition: {
    handler: conditionHandler,
    ports: portRegistry.condition,
  },

  transform: {
    handler: transformHandler,
    ports: portRegistry.transform,
  },

  metric_capture: {
    handler: metricCaptureHandler,
    ports: portRegistry.metric_capture,
  },

  human_review: {
    handler: humanReviewHandler,
    ports: portRegistry.human_review,
  },
};
