import { describe, test, expect } from "bun:test";
import { inferSchema } from "@/lib/pipeline/utils/infer-schema";

describe("inferSchema", () => {
  test("flat object with mixed primitives", () => {
    expect(
      inferSchema({ a: "hello", b: 42, c: true }),
    ).toEqual({ a: "", b: 0, c: false });
  });

  test("nested object", () => {
    expect(
      inferSchema({ user: { id: "abc", active: true }, count: 5 }),
    ).toEqual({ user: { id: "", active: false }, count: 0 });
  });

  test("array with single element is replaced by zero-value of that element type", () => {
    expect(inferSchema({ tags: ["foo", "bar"] })).toEqual({ tags: [""] });
    expect(inferSchema({ scores: [1, 2, 3] })).toEqual({ scores: [0] });
  });

  test("empty array stays empty", () => {
    expect(inferSchema({ items: [] })).toEqual({ items: [] });
  });

  test("null input returns null", () => {
    expect(inferSchema(null)).toBeNull();
  });

  test("undefined input returns null", () => {
    expect(inferSchema(undefined)).toBeNull();
  });

  test("full mixed payload from spec", () => {
    expect(
      inferSchema({ a: "hello", b: 42, c: true, d: [1, 2], e: { x: "y" } }),
    ).toEqual({ a: "", b: 0, c: false, d: [0], e: { x: "" } });
  });

  // Null inside an array stays null (null → null per contract).
  // @visual-json/react accepts null as a valid JsonPrimitive so it remains editable,
  // but the user will need to manually change the type in the editor.
  test("null inside array produces null placeholder", () => {
    expect(inferSchema({ items: [null] })).toEqual({ items: [null] });
  });
});
