## MODIFIED Requirements

### Requirement: Metric capture step

The system SHALL provide a `metric_capture` step type that records one or more evaluation metrics in a single step. Config MUST include a `metrics` object mapping metric names (keys) to dot-path expressions (values). The handler MUST resolve each path from input and return `{ "metrics": { "<name>": <resolved-value>, ... } }`. This is typically a terminal node in the graph. The handler MUST include a graceful fallback for nodes stored with the legacy `{ metricName, extractPath }` config shape, treating them as a single-entry metrics map.

#### Scenario: Capture single metric

- **WHEN** a metric_capture step has config `{ "metrics": { "accuracy": "steps.scorer.score" } }` and `steps.scorer.score` is 0.85
- **THEN** the handler returns `{ "metrics": { "accuracy": 0.85 } }`

#### Scenario: Capture multiple metrics

- **WHEN** a metric_capture step has config `{ "metrics": { "accuracy": "steps.scorer.score", "latency": "steps.llm.latencyMs" } }`
- **THEN** the handler returns `{ "metrics": { "accuracy": 0.85, "latency": 1200 } }`

#### Scenario: Legacy config fallback

- **WHEN** a metric_capture step has the old config shape `{ "metricName": "accuracy", "extractPath": "steps.scorer.score" }`
- **THEN** the handler treats it as `{ "metrics": { "accuracy": 0.85 } }` and returns the same output shape
