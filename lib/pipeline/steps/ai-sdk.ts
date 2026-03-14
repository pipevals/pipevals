import { generateText, generateObject, gateway, type FlexibleSchema } from "ai";
import type { AiSdkConfig, StepHandler } from "../types";
import { resolveTemplate } from "../dot-path";

export const aiSdkHandler: StepHandler<AiSdkConfig> = async (
  config,
  input,
) => {
  const context = { steps: input.steps, trigger: input.trigger };
  const prompt = String(resolveTemplate(config.promptTemplate, context));
  const model = gateway(config.model);

  const start = performance.now();

  if (config.responseFormat) {
    const resolvedSchema = resolveTemplate(
      config.responseFormat,
      context,
    ) as Record<string, unknown>;
    const result = await generateObject({
      model,
      prompt,
      schema: resolvedSchema as FlexibleSchema<unknown>,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    });
    const latencyMs = Math.round(performance.now() - start);

    return {
      object: result.object,
      usage: result.usage,
      latencyMs,
    };
  }

  const result = await generateText({
    model,
    prompt,
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens,
  });
  const latencyMs = Math.round(performance.now() - start);

  return {
    text: result.text,
    usage: result.usage,
    latencyMs,
  };
};
