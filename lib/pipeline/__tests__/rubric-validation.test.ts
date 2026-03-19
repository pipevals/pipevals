import { describe, expect, test } from "bun:test";
import { validateRubricResponse } from "../rubric-validation";
import type { RubricField } from "../types";

const rubric: RubricField[] = [
  { name: "accuracy", type: "rating", min: 1, max: 5 },
  { name: "relevant", type: "boolean", label: "Is the response relevant?" },
  { name: "notes", type: "text" },
  { name: "preference", type: "select", options: ["A", "B", "Tie"] },
];

describe("validateRubricResponse", () => {
  test("valid response returns no errors", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 4,
      relevant: true,
      notes: "Looks good",
      preference: "A",
    });
    expect(errors).toHaveLength(0);
  });

  test("missing field", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 4,
      relevant: true,
      notes: "Looks good",
      // preference missing
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("preference");
    expect(errors[0].message).toContain("Missing");
  });

  test("all fields missing", () => {
    const errors = validateRubricResponse(rubric, {});
    expect(errors).toHaveLength(4);
  });

  test("rating below min", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 0,
      relevant: true,
      notes: "x",
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("accuracy");
    expect(errors[0].message).toContain("between 1 and 5");
  });

  test("rating above max", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 6,
      relevant: true,
      notes: "x",
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("accuracy");
  });

  test("rating is not a number", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: "four",
      relevant: true,
      notes: "x",
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("accuracy");
    expect(errors[0].message).toContain("must be a number");
  });

  test("boolean field gets a string", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 3,
      relevant: "yes",
      notes: "x",
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("relevant");
    expect(errors[0].message).toContain("must be a boolean");
  });

  test("text field gets a number", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 3,
      relevant: false,
      notes: 42,
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("notes");
    expect(errors[0].message).toContain("must be a string");
  });

  test("select field gets invalid option", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: 3,
      relevant: true,
      notes: "x",
      preference: "C",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("preference");
    expect(errors[0].message).toContain("must be one of");
  });

  test("null value counts as missing", () => {
    const errors = validateRubricResponse(rubric, {
      accuracy: null,
      relevant: true,
      notes: "x",
      preference: "A",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("accuracy");
    expect(errors[0].message).toContain("Missing");
  });

  test("rating at boundary values is valid", () => {
    const errors = validateRubricResponse(
      [{ name: "score", type: "rating", min: 1, max: 5 }],
      { score: 1 },
    );
    expect(errors).toHaveLength(0);

    const errors2 = validateRubricResponse(
      [{ name: "score", type: "rating", min: 1, max: 5 }],
      { score: 5 },
    );
    expect(errors2).toHaveLength(0);
  });

  test("empty rubric accepts any response", () => {
    const errors = validateRubricResponse([], { anything: "goes" });
    expect(errors).toHaveLength(0);
  });
});
