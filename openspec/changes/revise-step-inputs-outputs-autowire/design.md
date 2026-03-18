## Context

Auto-wire populates a target node's config when an edge is drawn, using a source's primary output dot-path. Four step types currently have problems:
- `api_request` targets the `url` field — the URL is static; the body is where dynamic data belongs
- `sandbox` is entirely skipped — users have to manually type the input reference into code
- `condition` receives a bare dot-path like `steps.llm.text` which is not a valid expression (the parser requires a comparison operator)
- `metric_capture` uses a rigid `{metricName, extractPath}` config supporting only one metric per node, unlike `transform` which uses a flexible key/value mapping

## Goals / Non-Goals

**Goals:**
- Wire `api_request` body additively (same pattern as `transform` mapping)
- Wire `sandbox` code with a runtime-aware starter template so users can begin from a working reference
- Wire `condition` expression with a syntactically valid default (`${dotPath} != null`) instead of a bare path
- Migrate `metric_capture` config to `{ metrics: Record<string, string> }` and update the handler and auto-wire accordingly
- Update `extractMetrics` to consume the new handler output shape

**Non-Goals:**
- Changing how `sandbox` and `condition` behave as auto-wire **sources** (still skipped)
- Changing auto-wire for `ai_sdk`, `transform`, or trigger sources
- Altering any other step handler logic

## Decisions

### 1. api_request body uses `__body__` special key (same pattern as transform `__mapping__`)

`auto-wire.ts` maps `api_request` to `PRIMARY_INPUT_FIELD = "__body__"`. The handler for this special key mirrors `__mapping__`: merge an additive `{"": dotPath}` entry into `bodyTemplate`. The existing `apiRequestHandler` already resolves `bodyTemplate` values as dot-path templates, so no handler change is needed.

**Alternative considered**: populate the first empty value in an existing bodyTemplate entry. Rejected — too fragile; additive is safe and consistent with transform.

### 2. Sandbox code uses a runtime-aware starter template

`auto-wire.ts` maps `sandbox` to `PRIMARY_INPUT_FIELD = "code"`. Only wires when `code === ""`. The generated template reads `targetConfig.runtime` to emit appropriate syntax:
- Node: `return input["steps"]["label"]["key"];`
- Python: `return input["steps"]["label"]["key"]`

Dot-path segments from `dotPath` (e.g. `steps.llm.text`) are split on `.` and emitted as bracket-notation keys, compatible with both runtimes.

**Alternative considered**: always emit a comment-only stub. Rejected — a `return` statement gives a more immediately runnable template.

### 3. Condition expression gets `${dotPath} != null`

Instead of inserting a bare path, auto-wire sets `expression = "${dotPath} != null"`. This is always parseable by the existing condition handler (which splits on `!=`) and serves as a meaningful "is this value present?" default.

**Alternative considered**: `${dotPath} == true`. Rejected — too semantically specific; `!= null` works for any value type.

### 4. Metric capture config becomes `{ metrics: Record<string, string> }`

Replace `metricName + extractPath` with `metrics: Record<string, string>` (metric name → dot-path). The handler iterates entries and returns `{ metrics: { [name]: resolvedValue } }`. This mirrors the transform pattern and lets a single node capture multiple metrics.

`extractMetrics` adapts: iterate `Object.entries(sr.output?.metrics ?? {})` instead of reading a single `sr.output.metric` / `sr.output.value`.

Auto-wire maps `metric_capture` to `PRIMARY_INPUT_FIELD = "__metrics__"`. Handler for this special key mirrors `__mapping__`: additive `{"": dotPath}` to `metrics`.

**Alternative considered**: return an array `[{metric, value}]`. Rejected — an object keyed by metric name is easier to consume and aligns with transform's output shape.

### 5. Metric capture migration

The `config` column in `pipeline_nodes` is JSONB and stores the old shape `{metricName, extractPath}`. A Drizzle migration script will update existing rows. The handler also includes a graceful fallback that detects the old shape and adapts, covering any rows missed by the migration.

## Risks / Trade-offs

- [BREAKING: metric_capture config shape] → Mitigated by migration script + handler fallback
- [Sandbox code overwritten on re-wire] → Standard guard: skip if `code !== ""`; no regression from current behavior (previously always skipped)
- [Condition expression `!= null` may not match user intent] → User can freely edit after auto-wire; this is a starting point, not a fixed value

## Migration Plan

1. Deploy code changes (handler fallback active)
2. Run migration script to update all `metric_capture` node configs in `pipeline_nodes`
3. Rollback: revert code + restore old configs (migration is a plain UPDATE)
