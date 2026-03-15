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
});
