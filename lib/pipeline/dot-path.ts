import get from "lodash.get";

const MISSING = Symbol("MISSING");

export class DotPathError extends Error {
  constructor(public readonly path: string) {
    super(`Cannot resolve dot-path "${path}": path not found or value is undefined`);
    this.name = "DotPathError";
  }
}

/**
 * Resolves a dot-separated (or bracket-notation) path against a nested object.
 * Uses lodash.get under the hood for robust path resolution including array access.
 *
 * @example
 * resolveDotPath({ a: { b: { c: 42 } } }, "a.b.c") // 42
 * resolveDotPath({ scores: [0.8, 0.9] }, "scores[0]") // 0.8
 */
export function resolveDotPath(obj: unknown, path: string): unknown {
  const result = get(obj, path, MISSING);

  if (result === MISSING) {
    throw new DotPathError(path);
  }

  return result;
}

/**
 * Recursively walks a value and replaces any string that is a dot-path
 * expression (e.g. "steps.node1.output.text") with its resolved value.
 *
 * Strings that don't start with "steps." or "trigger." are left as-is.
 */
export function resolveTemplate(
  template: unknown,
  context: Record<string, unknown>,
): unknown {
  if (typeof template === "string") {
    if (template.startsWith("steps.") || template.startsWith("trigger.")) {
      return resolveDotPath(context, template);
    }
    return template;
  }

  if (Array.isArray(template)) {
    return template.map((item) => resolveTemplate(item, context));
  }

  if (template !== null && typeof template === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = resolveTemplate(value, context);
    }
    return result;
  }

  return template;
}
