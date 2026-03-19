export function validateItemsAgainstSchema(
  items: unknown[],
  schemaKeys: string[],
): { valid: true } | { valid: false; error: string } {
  const expected = [...schemaKeys].sort();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { valid: false, error: `items[${i}] must be an object` };
    }
    const itemKeys = Object.keys(item).sort();
    if (
      itemKeys.length !== expected.length ||
      !itemKeys.every((k, j) => k === expected[j])
    ) {
      return {
        valid: false,
        error: `items[${i}] keys must exactly match schema keys: ${schemaKeys.join(", ")}`,
      };
    }
  }

  return { valid: true };
}
