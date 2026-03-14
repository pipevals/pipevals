import type { stepTypeEnum } from "@/lib/db/pipeline-schema";

export type StepType = (typeof stepTypeEnum)[number];

export interface ApiRequestConfig {
  type: "api_request";
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
}

export interface AiSdkConfig {
  type: "ai_sdk";
  /** Gateway model string, e.g. "openai/gpt-4o" or "anthropic/claude-sonnet-4.5" */
  model: string;
  promptTemplate: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
}

export interface SandboxConfig {
  type: "sandbox";
  runtime: "node" | "python";
  code: string;
  timeout: number;
}

export interface ConditionConfig {
  type: "condition";
  expression: string;
  handles: string[];
}

export interface TransformConfig {
  type: "transform";
  mapping: Record<string, string>;
}

export interface MetricCaptureConfig {
  type: "metric_capture";
  metricName: string;
  extractPath: string;
}

export type NodeConfig =
  | ApiRequestConfig
  | AiSdkConfig
  | SandboxConfig
  | ConditionConfig
  | TransformConfig
  | MetricCaptureConfig;

// --- Execution types ---

export interface StepInput {
  steps: Record<string, Record<string, unknown>>;
  trigger: Record<string, unknown>;
}

export type StepOutput = Record<string, unknown>;

export type StepHandler<C = Record<string, unknown>> = (
  config: C,
  input: StepInput,
) => Promise<StepOutput>;

// --- Default configs ---

export const defaultConfigs: Record<StepType, NodeConfig> = {
  api_request: {
    type: "api_request",
    url: "",
    method: "POST",
    headers: {},
    bodyTemplate: {},
  },
  ai_sdk: {
    type: "ai_sdk",
    model: "openai/gpt-4o",
    promptTemplate: "",
    temperature: 0.7,
  },
  sandbox: {
    type: "sandbox",
    runtime: "node",
    code: "",
    timeout: 30000,
  },
  condition: {
    type: "condition",
    expression: "",
    handles: ["true", "false"],
  },
  transform: {
    type: "transform",
    mapping: {},
  },
  metric_capture: {
    type: "metric_capture",
    metricName: "",
    extractPath: "",
  },
};
