## Why

The current auto-wire logic for several step types is either missing or targets the wrong field, leading to poor UX when connecting nodes in the pipeline builder. Additionally, `metric_capture` is a single-metric step while `transform` supports multiple key/value pairs — unifying them improves consistency and flexibility.

## What Changes

- **API Request**: auto-wire target changes from `url` to `bodyTemplate` — the body receives the upstream dot-path reference as a key/value entry (additive, same pattern as `transform`)
- **Sandbox**: auto-wire target changes from `null` (skipped) to `code` — wiring a source injects a starter code template referencing the input path
- **Condition**: auto-wire still targets `expression`, but instead of the bare dot-path it inserts a syntactically valid default expression (e.g. `steps.llm.text != null`)
- **Metric Capture** (**BREAKING**): config changes from `{ metricName: string, extractPath: string }` to `{ metrics: Record<string, string> }` — a mapping of metric names to dot-path values, matching the `transform` pattern; auto-wire adds an additive key/value entry

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `step-registry`: Metric capture config shape changes (`metricName` + `extractPath` → `metrics` mapping); handler iterates over entries; sandbox becomes auto-wireable; condition receives a default expression template
- `pipeline-builder-ui`: Auto-wire scenarios change for `api_request` (body additive entry), `sandbox` (code template), `condition` (default expression), and `metric_capture` (additive metrics entry)

## Impact

- `lib/pipeline/types.ts` — `MetricCaptureConfig` type, `defaultConfigs.metric_capture`
- `lib/pipeline/config-schemas.ts` — `metricCaptureConfigSchema` Zod schema
- `lib/pipeline/steps/metric-capture.ts` — handler iterates `metrics` map
- `lib/pipeline/auto-wire.ts` — `PRIMARY_INPUT_FIELD` and special-case logic for `api_request`, `sandbox`, `condition`, `metric_capture`
- `lib/pipeline/__tests__/auto-wire.test.ts` — new/updated scenarios
- `lib/pipeline/__tests__/steps/metric-capture.test.ts` — updated for new config shape
- Config panel UI components for `metric_capture` and `api_request` body wiring
