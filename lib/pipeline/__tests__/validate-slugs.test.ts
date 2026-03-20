import { describe, test, expect } from "bun:test";
import { validateNodeSlugs } from "../validate-slugs";

describe("validateNodeSlugs", () => {
  test("all valid unique slugs", () => {
    const errors = validateNodeSlugs([
      { id: "a", slug: "generator" },
      { id: "b", slug: "judge" },
      { id: "c", slug: "metrics" },
    ]);
    expect(errors).toEqual([]);
  });

  test("duplicate slugs", () => {
    const errors = validateNodeSlugs([
      { id: "a", slug: "model_a" },
      { id: "b", slug: "model_a" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("model_a");
    expect(errors[0]).toContain("a");
    expect(errors[0]).toContain("b");
  });

  test("invalid slug format — uppercase", () => {
    const errors = validateNodeSlugs([{ id: "a", slug: "Model A" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("invalid slug");
  });

  test("invalid slug format — hyphens", () => {
    const errors = validateNodeSlugs([{ id: "a", slug: "model-a" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("invalid slug");
  });

  test("empty string slug", () => {
    const errors = validateNodeSlugs([{ id: "a", slug: "" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("invalid slug");
  });

  test("null slugs are allowed", () => {
    const errors = validateNodeSlugs([
      { id: "a", slug: null },
      { id: "b", slug: null },
      { id: "c", slug: null },
    ]);
    expect(errors).toEqual([]);
  });

  test("mixed null and non-null", () => {
    const errors = validateNodeSlugs([
      { id: "a", slug: null },
      { id: "b", slug: "generator" },
      { id: "c", slug: null },
      { id: "d", slug: "judge" },
    ]);
    expect(errors).toEqual([]);
  });

  test("multiple errors reported", () => {
    const errors = validateNodeSlugs([
      { id: "a", slug: "INVALID" },
      { id: "b", slug: "valid" },
      { id: "c", slug: "valid" },
    ]);
    expect(errors).toHaveLength(2); // one format error + one duplicate
  });
});
