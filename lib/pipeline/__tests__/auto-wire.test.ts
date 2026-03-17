import { describe, expect, test } from "bun:test";
import { autoWireInputs } from "../auto-wire";

const EMPTY_TRIGGER_SCHEMA = {};
const TRIGGER_SCHEMA = { prompt: "string", context: "string" };

describe("autoWireInputs", () => {
  // --- 3.1: Basic source → target combinations ---

  test("ai_sdk → ai_sdk: populates empty promptTemplate", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.promptTemplate).toBe("steps.llm.text");
  });

  test("ai_sdk → metric_capture: populates empty extractPath", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "eval",
      "node-2",
      "metric_capture",
      { type: "metric_capture", metricName: "score", extractPath: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.extractPath).toBe("steps.eval.text");
  });

  test("api_request → condition: populates empty expression", () => {
    const result = autoWireInputs(
      "api_request",
      "fetch",
      "node-3",
      "condition",
      { type: "condition", expression: "", handles: ["true", "false"] },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.expression).toBe("steps.fetch.body");
  });

  test("ai_sdk → transform: adds a new mapping entry", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "gen",
      "node-4",
      "transform",
      { type: "transform", mapping: { existing: "steps.other.value" } },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const mapping = result!.config.mapping as Record<string, string>;
    expect(mapping[""]).toBe("steps.gen.text");
    expect(mapping["existing"]).toBe("steps.other.value");
  });

  test("trigger → ai_sdk: uses first schema key", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "" },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.promptTemplate).toBe("trigger.prompt");
  });

  // --- 3.2: Non-overwrite behavior ---

  test("does not overwrite existing promptTemplate", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "existing value" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  test("does not overwrite existing extractPath", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "eval",
      "node-2",
      "metric_capture",
      { type: "metric_capture", metricName: "score", extractPath: "steps.other.value" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  test("does not overwrite existing expression", () => {
    const result = autoWireInputs(
      "api_request",
      "fetch",
      "node-3",
      "condition",
      { type: "condition", expression: "steps.foo.bar > 0", handles: ["true", "false"] },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  // --- 3.3: Skip cases ---

  test("sandbox source returns null", () => {
    const result = autoWireInputs(
      "sandbox",
      "runner",
      "node-5",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  test("condition source returns null", () => {
    const result = autoWireInputs(
      "condition",
      "branch",
      "node-6",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  test("sandbox target returns null", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "sandbox",
      { type: "sandbox", runtime: "node", code: "", timeout: 30000 },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  // --- 3.4: Trigger with empty schema ---

  test("trigger source with empty schema uses bare 'trigger' prefix", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "ai_sdk",
      { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.promptTemplate).toBe("trigger");
  });

  // --- Extra: label fallback to ID when label is empty ---

  test("uses sourceId as fallback when label is empty", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "",
      "my-node-id",
      "metric_capture",
      { type: "metric_capture", metricName: "", extractPath: "" },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.extractPath).toBe("steps.my-node-id.text");
  });
});
