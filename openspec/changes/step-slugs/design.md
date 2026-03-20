## Context

Pipeline nodes have an optional `label` (free-form text) that serves double duty: display name in the UI and identifier in dot-path expressions (`steps.<label>.<outputKey>`). This creates two problems:

1. **No uniqueness enforcement** — duplicate labels silently overwrite each other in the input resolver's `steps` object, causing wrong data to flow through the pipeline.
2. **Spaces in labels break auto-wire** — `auto-wire.ts` generates `steps.Model A.text` which fails the whole-string dot-path regex. It works in some step handlers (transform, metric_capture) only because lodash.get is forgiving, but fails in others (ai_sdk, condition) that use `resolveTemplate`.

The existing `slugify()` in `lib/slugify.ts` uses `-` (hyphens) for URL slugs. Step identifiers need `_` (underscores) to feel natural in dot-path expressions.

## Goals / Non-Goals

**Goals:**
- Introduce a `slug` field on pipeline nodes that is the single, stable identifier for dot-path references.
- Enforce slug uniqueness per pipeline (non-null slugs only).
- Auto-derive slug from label using `_` separator; allow user override.
- Show the slug in the config panel so users know exactly what their dot-paths will look like.
- Update auto-wire and input-resolver to use slug instead of raw label.
- Update seed templates with explicit slugs and slug-based dot-paths.

**Non-Goals:**
- Migrating existing user pipelines (no data migration).
- Changing the existing `slugify()` function (it's used for URL slugs with `-`).
- Making slugs required — null labels still produce null slugs, which are allowed.
- Enforcing uniqueness on labels (only on slugs).

## Decisions

### D1: New `stepSlugify()` function with `_` separator

Add a `stepSlugify(name: string): string` function alongside the existing `slugify()`. It lowercases, replaces non-alphanumeric runs with `_`, trims leading/trailing `_`. Returns empty string (not a random UUID) for empty input — the caller decides what to do with empty results.

**Why not parameterize `slugify()`?** The existing function has a fallback to `crypto.randomUUID()` for empty inputs, which makes sense for URL slugs but not for step identifiers where we want explicit control. Separate functions are clearer.

### D2: Slug stored as a column, not derived on-the-fly

Add `slug` as a nullable text column on `pipelineNodes`. Auto-derived from label on creation/rename, but the user can edit it directly.

**Why not derive at runtime?** If `stepSlugify` logic ever changes, previously auto-wired configs containing `steps.<old-slug>.<key>` would break. A stored slug is a stable contract.

**Why nullable?** Trigger nodes and nodes without labels don't need slugs. Uniqueness constraint applies only to non-null values (Postgres `CREATE UNIQUE INDEX ... WHERE slug IS NOT NULL`).

### D3: Shared validation function

A single `validateNodeSlugs(nodes: { id: string; slug: string | null }[]): string[]` function returns an array of error messages. Used by both:
- The API route (`PUT /api/pipelines/:id`) — returns 400 on errors.
- The Zustand store — surfaces errors in the UI before save.

Validation rules:
1. Non-null slugs must match `/^[a-z0-9]+(_[a-z0-9]+)*$/` (lowercase alphanumeric segments joined by single underscores).
2. Non-null slugs must be unique within the pipeline. Duplicate → error naming both node IDs.
3. Slugs must not be empty strings (null is fine, empty string is not).

### D4: Auto-wire uses slug, input-resolver keys by slug

- `auto-wire.ts`: `resolveSourceDotPath` uses `sourceSlug ?? sourceId` instead of `sourceLabel?.trim() ?? sourceId`.
- `input-resolver.ts`: Keys step outputs by `sourceNode.slug` (in addition to node ID). Drops the raw label keying.

This means existing configs with raw-label dot-paths (e.g., `steps.Model A.text`) will only resolve if the user updates them to slug-based paths. This is acceptable since we're not doing a migration and those paths were fragile anyway.

### D5: Config panel slug field with auto-derivation

The config panel shows:
- **Label** field (existing, free-form text).
- **Slug** field (new, auto-derived from label on change, editable). Uses muted styling.
- **Dot-path hint** below slug: `"Reference as: steps.<slug>.<primaryOutputKey>"` — only shown when the node has output ports.

When the user edits the label, the slug auto-updates (via `stepSlugify`). When the user manually edits the slug, auto-derivation stops until the label changes again.

### D6: Seed templates get explicit slugs

Each seed node gains a `slug` field in `SeedNode`. All dot-path references in configs updated from label-based to slug-based:
- `steps.Generator.text` → `steps.generator.text`
- `steps.Model A.text` → `steps.model_a.text`
- `steps.Collect Responses.response_a` → `steps.collect_responses.response_a`
- `steps.Human Review.scores.accuracy` → `steps.human_review.scores.accuracy`
- etc.

## Risks / Trade-offs

**[Risk] Existing user pipelines have label-based dot-paths** → No migration planned. Users editing old pipelines will see the new slug field and can update their configs. The input-resolver still keys by node ID as a fallback, so pipelines using ID-based references continue to work.

**[Risk] Trigger nodes get slugified** → Trigger nodes are type `"trigger"` and live in a separate namespace (`trigger.*` not `steps.*`). Their slug field will be null. No conflict.

**[Risk] User edits slug to collide with another node** → Caught by shared validation before save. UI shows inline error.

**[Trade-off] Stored slug vs derived** → Adds a column and slight complexity, but gives stable references and user visibility. Worth it.
