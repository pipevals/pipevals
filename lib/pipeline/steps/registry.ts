import type { StepType, StepDefinition } from "../types";
import { apiRequestHandler } from "./api-request";
import { aiSdkHandler } from "./ai-sdk";
import { sandboxHandler } from "./sandbox";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { metricCaptureHandler } from "./metric-capture";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepRegistry: Record<StepType, StepDefinition<any>> = {
  ai_sdk: {
    handler: aiSdkHandler,
    ports: {
      inputs: [{ configField: "promptTemplate", mode: "scalar" }],
      outputs: [{ key: "text" }],
    },
  },

  api_request: {
    handler: apiRequestHandler,
    ports: {
      inputs: [{ configField: "bodyTemplate", mode: "additive" }],
      outputs: [{ key: "body" }],
    },
  },

  sandbox: {
    handler: sandboxHandler,
    ports: {
      inputs: [
        {
          configField: "code",
          mode: "template",
          generate: (dotPath, config) => {
            const brackets = dotPath
              .split(".")
              .map((seg) => `["${seg}"]`)
              .join("");
            const isPython = config.runtime === "python";
            return isPython
              ? `return input${brackets}`
              : `return input${brackets};`;
          },
        },
      ],
      outputs: [],
    },
  },

  condition: {
    handler: conditionHandler,
    ports: {
      inputs: [
        { configField: "expression", mode: "scalar", valueSuffix: " != null" },
      ],
      outputs: [],
    },
  },

  transform: {
    handler: transformHandler,
    ports: {
      inputs: [{ configField: "mapping", mode: "additive" }],
      outputs: [],
    },
  },

  metric_capture: {
    handler: metricCaptureHandler,
    ports: {
      inputs: [{ configField: "metrics", mode: "additive" }],
      outputs: [],
    },
  },
};
