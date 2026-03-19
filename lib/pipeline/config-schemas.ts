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
  model: z.string().regex(/^.+\/.+$/, "Must be in provider/model format, e.g. openai/gpt-4o"),
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
  metrics: z.record(z.string(), z.string()),
});

export const rubricFieldSchema = z.discriminatedUnion("type", [
  z.object({ name: z.string(), type: z.literal("rating"), min: z.number(), max: z.number(), label: z.string().optional() }),
  z.object({ name: z.string(), type: z.literal("boolean"), label: z.string() }),
  z.object({ name: z.string(), type: z.literal("text"), label: z.string().optional(), placeholder: z.string().optional() }),
  z.object({ name: z.string(), type: z.literal("select"), label: z.string().optional(), options: z.array(z.string()) }),
]);

export const humanReviewConfigSchema = z.object({
  type: z.literal("human_review"),
  display: z.record(z.string(), z.string()),
  rubric: z.array(rubricFieldSchema),
  requiredReviewers: z.number().int().positive(),
});

export const nodeConfigSchema = z.discriminatedUnion("type", [
  apiRequestConfigSchema,
  aiSdkConfigSchema,
  sandboxConfigSchema,
  conditionConfigSchema,
  transformConfigSchema,
  metricCaptureConfigSchema,
  humanReviewConfigSchema,
]);
