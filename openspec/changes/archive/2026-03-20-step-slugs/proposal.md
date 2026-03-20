## Why

Pipeline node labels serve as both display names and machine identifiers in dot-path expressions (e.g. `steps.Generator.text`), but there is no uniqueness enforcement — duplicate labels silently overwrite each other in the input resolver. Labels with spaces also break whole-string dot-path resolution in auto-wire. Introducing an explicit, unique slug per node separates the display concern from the identifier concern, making dot-path references safe and predictable.

## What Changes

- Add a `slug` column to `pipelineNodes` — auto-derived from label using `_` as separator, editable by the user, unique per pipeline (among non-null values).
- **BREAKING**: Auto-wire and input-resolver use the slug (not raw label) for dot-path construction and step output keying.
- Shared validation logic (used by both API and UI) enforces slug uniqueness per pipeline and valid slug format.
- Config panel shows the slug field with auto-derivation from label and a dot-path preview hint.
- Seed templates updated with explicit slugs and slug-based dot-paths.
- New `stepSlugify()` utility using `_` as separator (existing `slugify()` with `-` stays for URL slugs).

## Capabilities

### New Capabilities
- `step-slug`: Slug field on pipeline nodes — derivation, uniqueness validation, format rules, and integration with auto-wire and input resolution.

### Modified Capabilities
- `pipeline-graph-model`: Pipeline nodes gain a `slug` column with a per-pipeline uniqueness constraint.
- `pipeline-api`: Update pipeline graph validation includes slug uniqueness and format checks.
- `step-port-declarations`: Output port dot-path construction uses slug instead of raw label.
- `seed-pipelines`: Seed templates include explicit slugs on nodes and slug-based dot-paths in configs.

## Impact

- **Schema**: New nullable `slug` column on `pipelineNodes` table.
- **API**: `PUT /api/pipelines/:id` validates slug uniqueness and format; node payloads accept optional `slug` field.
- **UI**: Config panel gains a slug input with auto-derivation; pipeline builder store tracks slugs.
- **Runtime**: `input-resolver.ts` keys by slug instead of raw label; `auto-wire.ts` uses slug for dot-paths.
- **Seeds**: All 3 seed template definitions updated with slugs and slug-based dot-path references.
- **Utilities**: New `stepSlugify()` function in `lib/slugify.ts`.
