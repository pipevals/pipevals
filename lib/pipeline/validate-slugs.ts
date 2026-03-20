const SLUG_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;

export function validateNodeSlugs(
  nodes: { id: string; slug: string | null }[],
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>(); // slug → first node id

  for (const node of nodes) {
    if (node.slug === null) continue;

    if (node.slug === "" || !SLUG_RE.test(node.slug)) {
      errors.push(
        `Node "${node.id}" has invalid slug "${node.slug}". Slugs must be lowercase alphanumeric segments joined by underscores (e.g. "model_a").`,
      );
      continue;
    }

    const existing = seen.get(node.slug);
    if (existing) {
      errors.push(
        `Duplicate slug "${node.slug}" on nodes "${existing}" and "${node.id}".`,
      );
    } else {
      seen.set(node.slug, node.id);
    }
  }

  return errors;
}
