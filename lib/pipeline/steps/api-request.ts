import type { ApiRequestConfig, StepHandler } from "../types";
import { resolveTemplate } from "@pipevals/workflow-walker";

export const apiRequestHandler: StepHandler<ApiRequestConfig> = async (
  config,
  input,
) => {
  "use step";
  const context = { steps: input.steps, trigger: input.trigger };

  const url = typeof config.url === "string"
    ? String(resolveTemplate(config.url, context))
    : config.url;

  const headers: Record<string, string> = config.headers
    ? (resolveTemplate(config.headers, context) as Record<string, string>)
    : {};

  let body: string | undefined;
  if (config.bodyTemplate && config.method !== "GET") {
    const resolved = resolveTemplate(config.bodyTemplate, context);
    body = JSON.stringify(resolved);
    headers["Content-Type"] ??= "application/json";
  }

  const response = await fetch(url, {
    method: config.method,
    headers,
    body,
  });

  const text = await response.text();
  let responseBody: unknown;
  try {
    responseBody = JSON.parse(text);
  } catch {
    responseBody = text;
  }

  if (!response.ok) {
    throw new Error(
      `API request failed with status ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return {
    status: response.status,
    body: responseBody,
  };
};
