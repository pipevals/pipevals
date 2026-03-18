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
 * Matches interpolation expressions: ${steps.X.Y}, ${trigger.X},
 * {{steps.X.Y}}, or {{trigger.X}}.
 */
const INTERPOLATION_RE = /\$\{((?:steps|trigger)\.[^}]+)\}|\{\{((?:steps|trigger)\.[^}]+)\}\}/g;

/**
 * Recursively walks a value and replaces dot-path expressions with their
 * resolved values from context.
 *
 * Resolution modes (in order of precedence):
 * 1. **Whole-string dot-path** — if the entire string is a dot-path
 *    (starts with "steps." or "trigger."), resolve and return the raw value
 *    (may be non-string).
 * 2. **Interpolation** — `${steps.X.Y}` or `{{steps.X.Y}}` expressions
 *    within a larger string are replaced inline, returning a string.
 * 3. **Literal** — strings without dot-path references are returned as-is.
 */
export function resolveTemplate(
  template: unknown,
  context: Record<string, unknown>,
): unknown {
  if (typeof template === "string") {
    // Whole-string dot-path (preserves non-string types)
    if (template.startsWith("steps.") || template.startsWith("trigger.")) {
      return resolveDotPath(context, template);
    }

    // Inline interpolation: replace ${steps.X.Y} / {{steps.X.Y}} expressions
    return template.replace(INTERPOLATION_RE, (_, dollarPath, mustachePath) => {
      const path = dollarPath ?? mustachePath;
      const value = resolveDotPath(context, path);
      return String(value);
    });
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
