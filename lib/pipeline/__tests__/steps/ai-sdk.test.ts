import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { AiSdkConfig, StepInput } from "../../types";

const mockGenerateText = mock(() =>
  Promise.resolve({
    text: "mocked response",
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  }),
);

const mockGenerateObject = mock(() =>
  Promise.resolve({
    object: { score: 0.85, reasoning: "good" },
    usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
  }),
);

const mockGateway = mock(() => "mock-model");

mock.module("ai", () => ({
  generateText: mockGenerateText,
  generateObject: mockGenerateObject,
  gateway: mockGateway,
  jsonSchema: (s: unknown) => s,
}));

const { aiSdkHandler } = await import("../../steps/ai-sdk");

const emptyInput: StepInput = { steps: {}, trigger: {} };

describe("aiSdkHandler", () => {
  beforeEach(() => {
    mockGenerateText.mockClear();
    mockGenerateObject.mockClear();
  });

  test("generateText returns text, usage, and latencyMs", async () => {
    const config: AiSdkConfig = {
      type: "ai_sdk",
      model: "anthropic/claude-sonnet-4.5",
      promptTemplate: "Hello world",
      temperature: 0.7,
    };

    const result = await aiSdkHandler(config, emptyInput);

    expect(result.text).toBe("mocked response");
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
    expect(typeof result.latencyMs).toBe("number");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  test("generateObject returns structured output when responseFormat configured", async () => {
    const config: AiSdkConfig = {
      type: "ai_sdk",
      model: "anthropic/claude-sonnet-4.5",
      promptTemplate: "Score this response",
      responseFormat: { type: "object", properties: {} },
    };

    const result = await aiSdkHandler(config, emptyInput);

    expect(result.object).toEqual({ score: 0.85, reasoning: "good" });
    expect(result.usage).toEqual({
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
    });
    expect(typeof result.latencyMs).toBe("number");
    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
  });

  test("resolves dot-path in prompt template", async () => {
    const config: AiSdkConfig = {
      type: "ai_sdk",
      model: "anthropic/claude-sonnet-4.5",
      promptTemplate: "steps.prev.text",
    };
    const input: StepInput = {
      steps: { prev: { text: "resolved prompt" } },
      trigger: {},
    };

    await aiSdkHandler(config, input);

    const calls = mockGenerateText.mock.calls as unknown as [Record<string, unknown>][];
    expect(calls[0][0].prompt).toBe("resolved prompt");
  });
});
