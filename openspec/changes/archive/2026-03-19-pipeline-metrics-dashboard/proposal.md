## Why

Pipeline runs produce captured metrics (relevance, coherence, score, etc.) via `metric_capture` steps, but these values are only visible one run at a time in the result panel. There is no way to see how metrics trend across runs, spot regressions, or get a high-level health picture of a pipeline. Users need an aggregate view to monitor evaluation quality over time.

## What Changes

- Add a new `/pipelines/:id/metrics` page that visualizes captured metrics across all runs of a pipeline using shadcn chart components (Recharts)
- Add a new `GET /api/pipelines/:id/runs/metrics` endpoint that joins runs with their `metric_capture` step results and returns a chart-ready payload
- Add pipeline sub-navigation (Editor | Metrics | Runs) for navigating between pipeline views
- Install `recharts` dependency and add the shadcn `chart` component primitives
- The metrics page includes:
  - Stat cards: total runs, pass rate, average metric value, average run duration
  - Metric trends area chart with toggleable x-axis (by run index / by time)
  - Score distribution histogram for a selected metric
  - Average step duration horizontal bar chart
  - Recent runs mini-table with inline metric values

## Capabilities

### New Capabilities
- `pipeline-metrics-api`: API endpoint that aggregates metric_capture outputs and step durations across all runs of a pipeline
- `pipeline-metrics-page`: Page and chart components for visualizing pipeline metrics over time

### Modified Capabilities
- `pipeline-run-viewer`: Adding sub-navigation across pipeline views (Editor, Metrics, Runs)

## Impact

- **New route**: `/pipelines/:id/metrics` page with server component + client chart components
- **New API**: `GET /api/pipelines/:id/runs/metrics` — joins `pipelineRuns` → `stepResults`, filters `metric_capture` nodes, returns aggregated data
- **New dependency**: `recharts` (peer dependency of shadcn chart component)
- **New UI component**: `components/ui/chart.tsx` (shadcn primitive)
- **Modified**: Pipeline page layout to include sub-navigation between Editor, Metrics, and Runs views
- **Database**: No schema changes — reads existing `pipelineRuns`, `stepResults`, `graphSnapshot` data
