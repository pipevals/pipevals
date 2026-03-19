import type { RubricField } from "./types";

export interface RubricValidationError {
  field: string;
  message: string;
}

/**
 * Validates a submission against a rubric definition.
 * Returns an array of errors (empty if valid).
 */
export function validateRubricResponse(
  rubric: RubricField[],
  response: Record<string, unknown>,
): RubricValidationError[] {
  const errors: RubricValidationError[] = [];

  for (const field of rubric) {
    const value = response[field.name];

    if (value === undefined || value === null) {
      errors.push({ field: field.name, message: `Missing required field "${field.name}"` });
      continue;
    }

    switch (field.type) {
      case "rating": {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          errors.push({ field: field.name, message: `"${field.name}" must be a number` });
        } else if (value < field.min || value > field.max) {
          errors.push({
            field: field.name,
            message: `"${field.name}" must be between ${field.min} and ${field.max}`,
          });
        }
        break;
      }
      case "boolean": {
        if (typeof value !== "boolean") {
          errors.push({ field: field.name, message: `"${field.name}" must be a boolean` });
        }
        break;
      }
      case "text": {
        if (typeof value !== "string") {
          errors.push({ field: field.name, message: `"${field.name}" must be a string` });
        }
        break;
      }
      case "select": {
        if (typeof value !== "string") {
          errors.push({ field: field.name, message: `"${field.name}" must be a string` });
        } else if (!field.options.includes(value)) {
          errors.push({
            field: field.name,
            message: `"${field.name}" must be one of: ${field.options.join(", ")}`,
          });
        }
        break;
      }
    }
  }

  return errors;
}
