import { z, type ZodTypeAny } from "zod";

/**
 * Build a Zod schema from a flat trigger schema object where keys are field
 * names and values are zero-value placeholders indicating the expected type.
 *
 *   ""    → z.string()
 *   0     → z.number()
 *   false → z.boolean()
 *   []    → z.array(z.unknown())
 *   {}    → z.record(z.string(), z.unknown())
 *   null  → z.unknown()
 */
function zodForPlaceholder(placeholder: unknown): ZodTypeAny {
  if (placeholder === null || placeholder === undefined) return z.unknown();
  if (typeof placeholder === "string") return z.string();
  if (typeof placeholder === "number") return z.number();
  if (typeof placeholder === "boolean") return z.boolean();
  if (Array.isArray(placeholder)) return z.array(z.unknown());
  if (typeof placeholder === "object") return z.record(z.string(), z.unknown());
  return z.unknown();
}

export function buildTriggerValidator(
  triggerSchema: Record<string, unknown>,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, placeholder] of Object.entries(triggerSchema)) {
    shape[key] = zodForPlaceholder(placeholder);
  }
  return z.object(shape).passthrough();
}
