import { describe, expect, test } from "bun:test";
import { resolveDisplayData } from "../../walker/human-review";
import type { StepInput } from "../../types";

const input: StepInput = {
  steps: {
    llm: { text: "The quarterly report shows growth." },
    api: { body: { status: 200, data: { score: 0.85 } } },
  },
  trigger: {
    prompt: "Evaluate this output",
    userId: "user_123",
  },
};

describe("resolveDisplayData", () => {
  test("resolves step output paths", () => {
    const result = resolveDisplayData(
      { "AI Response": "steps.llm.text" },
      input,
    );
    expect(result).toEqual({
      "AI Response": "The quarterly report shows growth.",
    });
  });

  test("resolves trigger paths", () => {
    const result = resolveDisplayData(
      { Prompt: "trigger.prompt" },
      input,
    );
    expect(result).toEqual({ Prompt: "Evaluate this output" });
  });

  test("resolves nested paths", () => {
    const result = resolveDisplayData(
      { Score: "steps.api.body.data.score" },
      input,
    );
    expect(result).toEqual({ Score: 0.85 });
  });

  test("resolves multiple display fields", () => {
    const result = resolveDisplayData(
      {
        "AI Response": "steps.llm.text",
        Prompt: "trigger.prompt",
        Score: "steps.api.body.data.score",
      },
      input,
    );
    expect(result).toEqual({
      "AI Response": "The quarterly report shows growth.",
      Prompt: "Evaluate this output",
      Score: 0.85,
    });
  });

  test("unresolvable path returns null", () => {
    const result = resolveDisplayData(
      { Missing: "steps.nonexistent.field" },
      input,
    );
    expect(result).toEqual({ Missing: null });
  });

  test("mix of valid and invalid paths", () => {
    const result = resolveDisplayData(
      {
        Valid: "steps.llm.text",
        Invalid: "steps.missing.path",
      },
      input,
    );
    expect(result.Valid).toBe("The quarterly report shows growth.");
    expect(result.Invalid).toBeNull();
  });

  test("empty display config returns empty object", () => {
    const result = resolveDisplayData({}, input);
    expect(result).toEqual({});
  });

  test("preserves non-string values (objects)", () => {
    const result = resolveDisplayData(
      { "API Body": "steps.api.body" },
      input,
    );
    expect(result["API Body"]).toEqual({ status: 200, data: { score: 0.85 } });
  });
});
