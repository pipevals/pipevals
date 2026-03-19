import type {
  stepTypeEnum,
  pipelineNodeTypeEnum,
} from "@/lib/db/pipeline-schema";

export type StepType = (typeof stepTypeEnum)[number];
export type PipelineNodeType = (typeof pipelineNodeTypeEnum)[number];

/** A model available through the AI Gateway. */
export interface GatewayModel {
  /** Full model identifier, e.g. "openai/gpt-4o" */
  id: string;
  /** Display name */
  name: string;
  /** Provider prefix extracted from the id, e.g. "openai" */
  provider: string;
}

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
  metrics: Record<string, string>;
}

export type RubricField =
  | { name: string; type: "rating"; min: number; max: number; label?: string }
  | { name: string; type: "boolean"; label: string }
  | { name: string; type: "text"; label?: string; placeholder?: string }
  | { name: string; type: "select"; label?: string; options: string[] };

export interface HumanReviewConfig {
  type: "human_review";
  /** Upstream data to display to reviewer: label → dot-path */
  display: Record<string, string>;
  /** The scoring rubric definition */
  rubric: RubricField[];
  /** Number of reviewers required (default 1) */
  requiredReviewers: number;
}

export type NodeConfig =
  | ApiRequestConfig
  | AiSdkConfig
  | SandboxConfig
  | ConditionConfig
  | TransformConfig
  | MetricCaptureConfig
  | HumanReviewConfig;

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

// --- Port declarations (BPMN-inspired input/output associations) ---

export interface ScalarInputPort {
  configField: string;
  mode: "scalar";
  /** Optional suffix appended to the dot-path value (e.g. " != null" for condition expressions) */
  valueSuffix?: string;
}

export interface AdditiveInputPort {
  configField: string;
  mode: "additive";
}

export interface TemplateInputPort {
  configField: string;
  mode: "template";
  generate: (dotPath: string, config: Record<string, unknown>) => string;
}

export type InputPort = ScalarInputPort | AdditiveInputPort | TemplateInputPort;

export interface OutputPort {
  /** The output key that downstream steps reference via dot-paths */
  key: string;
}

export interface StepDefinition<C = Record<string, unknown>> {
  handler: StepHandler<C>;
  ports: {
    inputs: InputPort[];
    /** Empty array means this step type is not auto-wireable as a source */
    outputs: OutputPort[];
  };
}

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
    metrics: {},
  },
  human_review: {
    type: "human_review",
    display: {},
    rubric: [],
    requiredReviewers: 1,
  },
};
