import { describe, test, expect } from "bun:test";
import { stepSlugify } from "../slugify";

describe("stepSlugify", () => {
  test("simple label", () => {
    expect(stepSlugify("Generator")).toBe("generator");
  });

  test("label with spaces", () => {
    expect(stepSlugify("Model A")).toBe("model_a");
  });

  test("label with multiple spaces and mixed case", () => {
    expect(stepSlugify("Collect Responses")).toBe("collect_responses");
  });

  test("label with special characters", () => {
    expect(stepSlugify("My Step #1!")).toBe("my_step_1");
  });

  test("empty input", () => {
    expect(stepSlugify("")).toBe("");
  });

  test("only special characters", () => {
    expect(stepSlugify("!@#$")).toBe("");
  });

  test("leading and trailing non-alphanumeric", () => {
    expect(stepSlugify("--hello--")).toBe("hello");
  });

  test("consecutive special characters collapse to single underscore", () => {
    expect(stepSlugify("a   b---c")).toBe("a_b_c");
  });
});
