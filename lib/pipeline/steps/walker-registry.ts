import type { StepRegistry, StepHandler } from "@pipevals/workflow-walker";
import { aiSdkHandler } from "./ai-sdk";
import { apiRequestHandler } from "./api-request";
import { sandboxHandler } from "./sandbox";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { metricCaptureHandler } from "./metric-capture";

/**
 * Walker-compatible step registry — handlers only, no ports.
 * Passed to createWalker() from the package.
 *
 * human_review is excluded (handled by the HookAdapter).
 *
 * Each handler carries "use step" so the workflow builder places
 * handler dependencies in the step bundle (not the workflow bundle).
 */
// Handlers use typed configs (AiSdkConfig, etc.) which are subtypes of
// the package's generic Record<string, unknown>. The cast is safe since
// the walker always passes the node's config object verbatim.
const h = (fn: (...args: any[]) => any) => fn as StepHandler;

export const walkerStepRegistry: StepRegistry = {
  ai_sdk: { handler: h(aiSdkHandler) },
  api_request: { handler: h(apiRequestHandler) },
  sandbox: { handler: h(sandboxHandler) },
  condition: { handler: h(conditionHandler) },
  transform: { handler: h(transformHandler) },
  metric_capture: { handler: h(metricCaptureHandler) },
};
