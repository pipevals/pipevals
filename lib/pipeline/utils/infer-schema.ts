/**
 * Recursively replaces leaf values with zero-value placeholders by type.
 * Used to derive a schema template from a sample JSON payload.
 *
 * string  → ""
 * number  → 0
 * boolean → false
 * array   → [inferSchema(first element)] or []
 * object  → { key: inferSchema(value), ... }
 * null    → null
 */
export function inferSchema(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return "";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    return [inferSchema(value[0])];
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = inferSchema(v);
    }
    return result;
  }
  return null;
}
