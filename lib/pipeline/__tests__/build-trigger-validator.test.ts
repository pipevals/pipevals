import { describe, expect, test } from "bun:test";
import { buildTriggerValidator } from "../utils/build-trigger-validator";

describe("buildTriggerValidator", () => {
  test("empty schema accepts any object", () => {
    const validator = buildTriggerValidator({});
    expect(validator.safeParse({}).success).toBe(true);
    expect(validator.safeParse({ extra: "field" }).success).toBe(true);
  });

  test("validates string fields", () => {
    const validator = buildTriggerValidator({ prompt: "" });

    expect(validator.safeParse({ prompt: "hello" }).success).toBe(true);
    expect(validator.safeParse({ prompt: 123 }).success).toBe(false);
    expect(validator.safeParse({}).success).toBe(false);
  });

  test("validates number fields", () => {
    const validator = buildTriggerValidator({ temperature: 0 });

    expect(validator.safeParse({ temperature: 0.7 }).success).toBe(true);
    expect(validator.safeParse({ temperature: "hot" }).success).toBe(false);
    expect(validator.safeParse({}).success).toBe(false);
  });

  test("validates boolean fields", () => {
    const validator = buildTriggerValidator({ verbose: false });

    expect(validator.safeParse({ verbose: true }).success).toBe(true);
    expect(validator.safeParse({ verbose: "yes" }).success).toBe(false);
    expect(validator.safeParse({}).success).toBe(false);
  });

  test("validates array fields", () => {
    const validator = buildTriggerValidator({ tags: [] });

    expect(validator.safeParse({ tags: ["a", "b"] }).success).toBe(true);
    expect(validator.safeParse({ tags: [1, 2] }).success).toBe(true);
    expect(validator.safeParse({ tags: "not-array" }).success).toBe(false);
  });

  test("validates nested object fields", () => {
    const validator = buildTriggerValidator({ options: {} });

    expect(validator.safeParse({ options: { key: "val" } }).success).toBe(true);
    expect(validator.safeParse({ options: "flat" }).success).toBe(false);
  });

  test("null placeholder accepts any value", () => {
    const validator = buildTriggerValidator({ data: null });

    expect(validator.safeParse({ data: "string" }).success).toBe(true);
    expect(validator.safeParse({ data: 42 }).success).toBe(true);
    expect(validator.safeParse({ data: null }).success).toBe(true);
  });

  test("validates multiple fields together", () => {
    const validator = buildTriggerValidator({
      prompt: "",
      temperature: 0,
      verbose: false,
    });

    expect(
      validator.safeParse({ prompt: "hi", temperature: 0.5, verbose: true }).success,
    ).toBe(true);

    // missing required field
    expect(
      validator.safeParse({ prompt: "hi", verbose: true }).success,
    ).toBe(false);

    // wrong type
    expect(
      validator.safeParse({ prompt: "hi", temperature: "warm", verbose: true }).success,
    ).toBe(false);
  });

  test("allows extra fields via passthrough", () => {
    const validator = buildTriggerValidator({ prompt: "" });
    const result = validator.safeParse({ prompt: "hello", source: "ui" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ prompt: "hello", source: "ui" });
    }
  });

  test("returns Zod error for missing required field", () => {
    const validator = buildTriggerValidator({ prompt: "" });
    const result = validator.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["prompt"]);
    }
  });
});
