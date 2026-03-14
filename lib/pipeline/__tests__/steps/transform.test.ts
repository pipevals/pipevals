import { describe, expect, test } from "bun:test";
import { transformHandler } from "../../steps/transform";
import type { TransformConfig, StepInput } from "../../types";

const input: StepInput = {
  steps: {
    llm: { text: "hello", model: "gpt-4o" },
    scorer: { score: 0.85 },
  },
  trigger: { prompt: "test" },
};

describe("transformHandler", () => {
  test("resolves mapping of dot-paths", async () => {
    const config: TransformConfig = {
      type: "transform",
      mapping: {
        response: "steps.llm.text",
        accuracy: "steps.scorer.score",
        originalPrompt: "trigger.prompt",
      },
    };

    const result = await transformHandler(config, input);
    expect(result).toEqual({
      response: "hello",
      accuracy: 0.85,
      originalPrompt: "test",
    });
  });

  test("fails on unresolvable path", async () => {
    const config: TransformConfig = {
      type: "transform",
      mapping: { missing: "steps.nonexistent.field" },
    };

    await expect(transformHandler(config, input)).rejects.toThrow("Cannot resolve dot-path");
  });

  test("empty mapping returns empty object", async () => {
    const config: TransformConfig = { type: "transform", mapping: {} };
    const result = await transformHandler(config, input);
    expect(result).toEqual({});
  });
});
