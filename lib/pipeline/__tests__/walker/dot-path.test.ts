import { describe, expect, test } from "bun:test";
import { resolveDotPath, resolveTemplate, DotPathError } from "../../dot-path";

describe("resolveDotPath", () => {
  test("resolves nested path", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(resolveDotPath(obj, "a.b.c")).toBe(42);
  });

  test("resolves single key", () => {
    expect(resolveDotPath({ name: "test" }, "name")).toBe("test");
  });

  test("returns null value without error", () => {
    expect(resolveDotPath({ a: null }, "a")).toBe(null);
  });

  test("throws on missing intermediate key", () => {
    const obj = { a: { b: 1 } };
    expect(() => resolveDotPath(obj, "a.x.y")).toThrow(DotPathError);
  });

  test("throws on null intermediate", () => {
    const obj = { a: null };
    expect(() => resolveDotPath(obj, "a.b")).toThrow(DotPathError);
  });

  test("throws on undefined root", () => {
    expect(() => resolveDotPath(undefined, "a")).toThrow(DotPathError);
  });

  test("resolves array index via string key", () => {
    const obj = { items: ["a", "b", "c"] };
    expect(resolveDotPath(obj, "items.1")).toBe("b");
  });
});

describe("resolveTemplate", () => {
  test("resolves dot-path strings starting with steps.", () => {
    const ctx = { steps: { n1: { score: 0.9 } }, trigger: {} };
    expect(resolveTemplate("steps.n1.score", ctx)).toBe(0.9);
  });

  test("resolves dot-path strings starting with trigger.", () => {
    const ctx = { steps: {}, trigger: { prompt: "hello" } };
    expect(resolveTemplate("trigger.prompt", ctx)).toBe("hello");
  });

  test("leaves non-dot-path strings untouched", () => {
    const ctx = { steps: {}, trigger: {} };
    expect(resolveTemplate("just a string", ctx)).toBe("just a string");
  });

  test("recursively resolves objects", () => {
    const ctx = { steps: { n1: { val: 42 } }, trigger: {} };
    const result = resolveTemplate({ key: "steps.n1.val", other: "static" }, ctx);
    expect(result).toEqual({ key: 42, other: "static" });
  });

  test("recursively resolves arrays", () => {
    const ctx = { steps: { n1: { a: 1 } }, trigger: {} };
    const result = resolveTemplate(["steps.n1.a", "plain"], ctx);
    expect(result).toEqual([1, "plain"]);
  });

  test("passes through numbers and booleans", () => {
    const ctx = { steps: {}, trigger: {} };
    expect(resolveTemplate(42, ctx)).toBe(42);
    expect(resolveTemplate(true, ctx)).toBe(true);
  });

  test("interpolates ${steps.X.Y} within a string", () => {
    const ctx = { steps: { gen: { text: "Hello world" } }, trigger: { prompt: "Say hi" } };
    const result = resolveTemplate(
      "Evaluate this response: ${steps.gen.text} for prompt: ${trigger.prompt}",
      ctx,
    );
    expect(result).toBe("Evaluate this response: Hello world for prompt: Say hi");
  });

  test("interpolates {{steps.X.Y}} within a string", () => {
    const ctx = { steps: { gen: { text: "Hello world" } }, trigger: {} };
    const result = resolveTemplate("Response: {{steps.gen.text}}", ctx);
    expect(result).toBe("Response: Hello world");
  });

  test("interpolates mixed ${} and {{}} in same string", () => {
    const ctx = { steps: { a: { v: "A" } }, trigger: { q: "Q" } };
    const result = resolveTemplate("${steps.a.v} and {{trigger.q}}", ctx);
    expect(result).toBe("A and Q");
  });

  test("interpolation converts non-string values to strings", () => {
    const ctx = { steps: { n1: { score: 0.95 } }, trigger: {} };
    const result = resolveTemplate("Score is ${steps.n1.score}", ctx);
    expect(result).toBe("Score is 0.95");
  });

  test("interpolation throws on missing path", () => {
    const ctx = { steps: {}, trigger: {} };
    expect(() => resolveTemplate("Value: ${steps.missing.key}", ctx)).toThrow(DotPathError);
  });

  test("leaves ${non.dotpath} expressions untouched", () => {
    const ctx = { steps: {}, trigger: {} };
    expect(resolveTemplate("Price: ${amount}", ctx)).toBe("Price: ${amount}");
  });

  test("whole-string dot-path still returns raw non-string types", () => {
    const ctx = { steps: { n1: { score: 0.9 } }, trigger: {} };
    expect(resolveTemplate("steps.n1.score", ctx)).toBe(0.9);
  });

  test("string starting with steps. but containing extra text is not a whole-string dot-path", () => {
    const ctx = { steps: { foo: { bar: "val" } }, trigger: {} };
    // "steps.foo.bar extra text" should NOT be treated as a dot-path —
    // it should pass through as a literal (no interpolation markers either)
    expect(resolveTemplate("steps.foo.bar extra text", ctx)).toBe("steps.foo.bar extra text");
  });

  test("labels with spaces use interpolation syntax, not whole-string dot-path", () => {
    const ctx = { steps: { "Collect Responses": { response_a: "hello" } }, trigger: {} };
    expect(resolveTemplate("${steps.Collect Responses.response_a}", ctx)).toBe("hello");
  });
});
