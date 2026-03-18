import type { StepType, InputPort, OutputPort } from "../types";

export interface PortDefinition {
  inputs: InputPort[];
  outputs: OutputPort[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const portRegistry: Record<StepType, PortDefinition> = {
  ai_sdk: {
    inputs: [{ configField: "promptTemplate", mode: "scalar" }],
    outputs: [{ key: "text" }],
  },

  api_request: {
    inputs: [{ configField: "bodyTemplate", mode: "additive" }],
    outputs: [{ key: "body" }],
  },

  sandbox: {
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

  condition: {
    inputs: [
      { configField: "expression", mode: "scalar", valueSuffix: " != null" },
    ],
    outputs: [],
  },

  transform: {
    inputs: [{ configField: "mapping", mode: "additive" }],
    outputs: [],
  },

  metric_capture: {
    inputs: [{ configField: "metrics", mode: "additive" }],
    outputs: [],
  },
};
