import { z } from "zod";

export const apiRequestConfigSchema = z.object({
  type: z.literal("api_request"),
  url: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  headers: z.record(z.string(), z.string()).optional(),
  bodyTemplate: z.record(z.string(), z.unknown()).optional(),
});

export const aiSdkConfigSchema = z.object({
  type: z.literal("ai_sdk"),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptTemplate: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  responseFormat: z.record(z.string(), z.unknown()).optional(),
});

export const sandboxConfigSchema = z.object({
  type: z.literal("sandbox"),
  runtime: z.enum(["node", "python"]),
  code: z.string().min(1),
  timeout: z.number().int().positive().max(300_000),
});

export const conditionConfigSchema = z.object({
  type: z.literal("condition"),
  expression: z.string().min(1),
  handles: z.array(z.string().min(1)).min(2),
});

export const transformConfigSchema = z.object({
  type: z.literal("transform"),
  mapping: z.record(z.string().min(1), z.string().min(1)),
});

export const metricCaptureConfigSchema = z.object({
  type: z.literal("metric_capture"),
  metricName: z.string().min(1),
  extractPath: z.string().min(1),
});

export const nodeConfigSchema = z.discriminatedUnion("type", [
  apiRequestConfigSchema,
  aiSdkConfigSchema,
  sandboxConfigSchema,
  conditionConfigSchema,
  transformConfigSchema,
  metricCaptureConfigSchema,
]);
