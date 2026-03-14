import { describe, expect, test } from "bun:test";
import { conditionHandler } from "../../steps/condition";
import type { ConditionConfig, StepInput } from "../../types";

function input(score: number): StepInput {
  return { steps: { scorer: { score } }, trigger: {} };
}

function config(expression: string): ConditionConfig {
  return { type: "condition", expression, handles: ["true", "false"] };
}

describe("conditionHandler", () => {
  test("> operator: true branch", async () => {
    const result = await conditionHandler(config("steps.scorer.score > 0.5"), input(0.8));
    expect(result.branch).toBe("true");
  });

  test("> operator: false branch", async () => {
    const result = await conditionHandler(config("steps.scorer.score > 0.5"), input(0.3));
    expect(result.branch).toBe("false");
  });

  test("< operator", async () => {
    const result = await conditionHandler(config("steps.scorer.score < 0.5"), input(0.3));
    expect(result.branch).toBe("true");
  });

  test(">= operator: equal value", async () => {
    const result = await conditionHandler(config("steps.scorer.score >= 0.5"), input(0.5));
    expect(result.branch).toBe("true");
  });

  test("<= operator", async () => {
    const result = await conditionHandler(config("steps.scorer.score <= 0.5"), input(0.5));
    expect(result.branch).toBe("true");
  });

  test("== operator with number", async () => {
    const result = await conditionHandler(config("steps.scorer.score == 1"), input(1));
    expect(result.branch).toBe("true");
  });

  test("== operator: not equal", async () => {
    const result = await conditionHandler(config("steps.scorer.score == 1"), input(0.9));
    expect(result.branch).toBe("false");
  });

  test("!= operator", async () => {
    const result = await conditionHandler(config("steps.scorer.score != 0"), input(0.5));
    expect(result.branch).toBe("true");
  });

  test("!= operator: equal values", async () => {
    const result = await conditionHandler(config("steps.scorer.score != 0.5"), input(0.5));
    expect(result.branch).toBe("false");
  });

  test("resolves trigger path", async () => {
    const inp: StepInput = { steps: {}, trigger: { threshold: 0.7 } };
    const result = await conditionHandler(config("trigger.threshold > 0.5"), inp);
    expect(result.branch).toBe("true");
  });

  test("compares string literals", async () => {
    const inp: StepInput = { steps: { node: { status: "pass" } }, trigger: {} };
    const cfg: ConditionConfig = {
      type: "condition",
      expression: 'steps.node.status == "pass"',
      handles: ["yes", "no"],
    };
    const result = await conditionHandler(cfg, inp);
    expect(result.branch).toBe("yes");
  });

  test("invalid expression throws", async () => {
    await expect(
      conditionHandler(
        { type: "condition", expression: "no operator here", handles: ["a", "b"] },
        input(1),
      ),
    ).rejects.toThrow("Invalid condition expression");
  });
});
