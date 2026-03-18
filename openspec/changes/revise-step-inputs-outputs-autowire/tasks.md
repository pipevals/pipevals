## 1. Metric Capture Config Migration

- [x] 1.1 Update `MetricCaptureConfig` type in `lib/pipeline/types.ts` to `{ type: "metric_capture"; metrics: Record<string, string> }`
- [x] 1.2 Update `metricCaptureConfigSchema` in `lib/pipeline/config-schemas.ts` to use `metrics: z.record(z.string(), z.string())`
- [x] 1.3 Update `defaultConfigs.metric_capture` in `lib/pipeline/types.ts` to `{ type: "metric_capture", metrics: {} }`
- [x] 1.4 Rewrite `metricCaptureHandler` in `lib/pipeline/steps/metric-capture.ts` to iterate `config.metrics` entries and return `{ metrics: { [name]: value } }`; include fallback for legacy `{ metricName, extractPath }` shape
- [x] 1.5 Update `extractMetrics` in `lib/pipeline/extract-metrics.ts` to iterate `Object.entries(sr.output?.metrics ?? {})` instead of reading single `sr.output.metric` / `sr.output.value`

## 2. Auto-Wire Logic Updates

- [x] 2.1 Change `PRIMARY_INPUT_FIELD.api_request` from `"url"` to `"__body__"` in `lib/pipeline/auto-wire.ts`
- [x] 2.2 Add `__body__` special-case handler in `autoWireInputs` that additively merges `{"": dotPath}` into `bodyTemplate` (mirrors `__mapping__` logic)
- [x] 2.3 Change `PRIMARY_INPUT_FIELD.sandbox` from `null` to `"code"` in `lib/pipeline/auto-wire.ts`
- [x] 2.4 Add `code` special-case handler in `autoWireInputs` that, when `targetConfig.code === ""`, sets `code` to a runtime-aware bracket-notation starter template derived from the dotPath segments; check `targetConfig.runtime` to emit `return` (node) or plain expression (python)
- [ ] 2.5 Change condition auto-wire in `autoWireInputs` so the value inserted into `expression` is `${dotPath} != null` instead of the bare dotPath
- [ ] 2.6 Change `PRIMARY_INPUT_FIELD.metric_capture` from `"extractPath"` to `"__metrics__"` in `lib/pipeline/auto-wire.ts`
- [ ] 2.7 Add `__metrics__` special-case handler in `autoWireInputs` that additively merges `{"": dotPath}` into `metrics` (mirrors `__mapping__` logic)

## 3. Tests

- [ ] 3.1 Update `lib/pipeline/__tests__/auto-wire.test.ts`: add scenarios for api_request body additive entry, sandbox code template (node and python runtimes), condition default expression, metric_capture metrics additive entry
- [ ] 3.2 Update `lib/pipeline/__tests__/steps/metric-capture.test.ts`: replace old `metricName` / `extractPath` tests with new `metrics` map tests; add legacy fallback scenario
- [ ] 3.3 Update `lib/pipeline/__tests__/extract-metrics.test.ts` for new handler output shape

## 4. Config Panel UI

- [ ] 4.1 Update the metric_capture config panel component to render a key/value editor for `metrics` (same pattern as transform's mapping editor) instead of `metricName` + `extractPath` fields
- [ ] 4.2 Update the api_request config panel to ensure `bodyTemplate` renders as an editable key/value list (consistent with the additive auto-wire behavior)
