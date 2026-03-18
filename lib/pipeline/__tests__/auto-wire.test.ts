import { describe, expect, test } from "bun:test";
import { autoWireInputs } from "../auto-wire";

const EMPTY_TRIGGER_SCHEMA = {};
const TRIGGER_SCHEMA = { prompt: "string", context: "string" };

describe("autoWireInputs", () => {
  // --- ai_sdk target ---

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

  // --- api_request target (body) ---

  test("ai_sdk → api_request: adds entry to empty bodyTemplate", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "api_request",
      { type: "api_request", url: "https://api.example.com", method: "POST", bodyTemplate: {} },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const body = result!.config.bodyTemplate as Record<string, string>;
    expect(body[""]).toBe("steps.llm.text");
  });

  test("ai_sdk → api_request: additive — preserves existing bodyTemplate entries", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "api_request",
      {
        type: "api_request",
        url: "https://api.example.com",
        method: "POST",
        bodyTemplate: { existing: "steps.other.value" },
      },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const body = result!.config.bodyTemplate as Record<string, string>;
    expect(body[""]).toBe("steps.llm.text");
    expect(body["existing"]).toBe("steps.other.value");
  });

  // --- sandbox target (code) ---

  test("ai_sdk → sandbox (node): sets bracket-notation code template", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "sandbox",
      { type: "sandbox", runtime: "node", code: "", timeout: 30000 },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.code).toBe('return input["steps"]["llm"]["text"];');
  });

  test("ai_sdk → sandbox (python): sets bracket-notation code template without semicolon", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "sandbox",
      { type: "sandbox", runtime: "python", code: "", timeout: 30000 },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.code).toBe('return input["steps"]["llm"]["text"]');
  });

  test("sandbox code not overwritten when non-empty", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "llm",
      "node-1",
      "sandbox",
      { type: "sandbox", runtime: "node", code: "return 42;", timeout: 30000 },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).toBeNull();
  });

  // --- condition target (expression with default) ---

  test("api_request → condition: populates expression with default comparison", () => {
    const result = autoWireInputs(
      "api_request",
      "fetch",
      "node-3",
      "condition",
      { type: "condition", expression: "", handles: ["true", "false"] },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.expression).toBe("steps.fetch.body != null");
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

  // --- transform target (mapping) ---

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

  // --- metric_capture target (metrics map) ---

  test("ai_sdk → metric_capture: adds entry to metrics map", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "eval",
      "node-2",
      "metric_capture",
      { type: "metric_capture", metrics: {} },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const metrics = result!.config.metrics as Record<string, string>;
    expect(metrics[""]).toBe("steps.eval.text");
  });

  test("ai_sdk → metric_capture: additive — preserves existing metrics entries", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "eval",
      "node-2",
      "metric_capture",
      { type: "metric_capture", metrics: { accuracy: "steps.scorer.score" } },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const metrics = result!.config.metrics as Record<string, string>;
    expect(metrics[""]).toBe("steps.eval.text");
    expect(metrics["accuracy"]).toBe("steps.scorer.score");
  });

  // --- trigger source ---

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

  test("trigger → api_request: adds entry to bodyTemplate", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "api_request",
      { type: "api_request", url: "https://api.example.com", method: "POST", bodyTemplate: {} },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const body = result!.config.bodyTemplate as Record<string, string>;
    expect(body[""]).toBe("trigger.prompt");
  });

  test("trigger → sandbox (node): sets bracket-notation code template", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "sandbox",
      { type: "sandbox", runtime: "node", code: "", timeout: 30000 },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.code).toBe('return input["trigger"]["prompt"];');
  });

  test("trigger → sandbox (python): sets bracket-notation code template without semicolon", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "sandbox",
      { type: "sandbox", runtime: "python", code: "", timeout: 30000 },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.code).toBe('return input["trigger"]["prompt"]');
  });

  test("trigger → condition: populates expression with default comparison", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "condition",
      { type: "condition", expression: "", handles: ["true", "false"] },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    expect(result!.config.expression).toBe("trigger.prompt != null");
  });

  test("trigger → transform: adds entry to mapping", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "transform",
      { type: "transform", mapping: {} },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const mapping = result!.config.mapping as Record<string, string>;
    expect(mapping[""]).toBe("trigger.prompt");
  });

  test("trigger → metric_capture: adds entry to metrics map", () => {
    const result = autoWireInputs(
      "trigger",
      "Trigger",
      "trigger-source",
      "metric_capture",
      { type: "metric_capture", metrics: {} },
      TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const metrics = result!.config.metrics as Record<string, string>;
    expect(metrics[""]).toBe("trigger.prompt");
  });

  // --- skip cases ---

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

  test("metric_capture source returns null", () => {
    const result = autoWireInputs(
      "metric_capture",
      "capture",
      "node-7",
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

  // --- label fallback ---

  test("uses sourceId as fallback when label is empty", () => {
    const result = autoWireInputs(
      "ai_sdk",
      "",
      "my-node-id",
      "metric_capture",
      { type: "metric_capture", metrics: {} },
      EMPTY_TRIGGER_SCHEMA,
    );
    expect(result).not.toBeNull();
    const metrics = result!.config.metrics as Record<string, string>;
    expect(metrics[""]).toBe("steps.my-node-id.text");
  });
});
