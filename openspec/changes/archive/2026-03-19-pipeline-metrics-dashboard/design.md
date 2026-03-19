## Context

Pipeline runs produce captured metrics via `metric_capture` steps, but these are only visible one run at a time in the result panel (`ResultPanel` → `MetricsPanel`). The `extractMetrics()` utility pulls `{ name, value }` pairs from step results where the node type is `metric_capture`. Users need an aggregate view to track metrics across runs of a single pipeline.

Currently, the runs list API (`GET /api/pipelines/:id/runs`) returns only summary fields (id, status, timestamps, triggerPayload) — no step results or metrics. The run detail API returns full step results but only for one run. There is no chart library installed.

The pipeline route structure today:
- `/pipelines/:id` — editor (canvas)
- `/pipelines/:id/runs` — run list table
- `/pipelines/:id/runs/:runId` — single run viewer

## Goals / Non-Goals

**Goals:**
- Provide an aggregate metrics view for a single pipeline across all its completed runs
- Use shadcn chart components (Recharts) consistent with the existing design system
- Keep the API focused: one new endpoint that returns chart-ready data from existing tables
- Allow toggling between run-index and time-based x-axis on trend charts

**Non-Goals:**
- Cross-pipeline comparison or global dashboard views
- Cost tracking, token usage, or infrastructure metrics (not in the data model)
- Smart metric type detection — user is responsible for ensuring `metric_capture` outputs are chart-friendly values
- Stat card trend deltas (e.g., "+2.1% vs last period") — deferred for simplicity
- Alerting or threshold configuration
- Real-time streaming of metrics during active runs

## Decisions

### 1. Separate `/runs/metrics` endpoint vs. expanding the runs list API

**Decision**: New dedicated `GET /api/pipelines/:id/runs/metrics` endpoint.

**Why**: The existing runs list endpoint is polled at 3s intervals during active runs and must stay lightweight. The metrics endpoint serves a different access pattern — loaded once on page mount, revalidated infrequently. Joining `stepResults` for every run is a heavier query that shouldn't be on the polling path.

**Alternative considered**: Query parameter `?include=metrics` on the existing endpoint. Rejected because it conflates two access patterns with different performance profiles.

### 2. Server-side aggregation vs. client-side computation

**Decision**: The API returns per-run metric values and step durations. The client computes aggregates (averages, histograms, stat card values).

**Why**: The interesting aggregations depend on UI state (which metric is selected for histogram, which runs are in view). Shipping raw data per run keeps the API simple and the client flexible. The data volume is bounded — even 500 runs with 5 metrics each is a small payload.

**Alternative considered**: Server-computed aggregates (avg, p50, p95). Rejected because it would require the API to anticipate all client views, and the payload is small enough to compute client-side.

### 3. Metric name discovery

**Decision**: Union all distinct metric names found across all runs returned by the endpoint.

**Why**: Different runs may have captured different metrics if the pipeline config was modified between runs (graphSnapshot freezes config per run). Using the union ensures no historical data is hidden. Metrics missing from some runs simply show as gaps in the chart.

**Alternative considered**: Only show metrics from the current pipeline config. Rejected because it silently drops historical data from before config changes.

### 4. Sub-navigation approach

**Decision**: Add a horizontal tab nav below the breadcrumb on all pipeline sub-pages (Editor | Metrics | Runs). Implemented as a shared layout or component rendered in each page.

**Why**: Consistent with the mockups' navigation pattern. Keeps pipeline views discoverable without deep nesting. Uses shadcn `Tabs` (navigation variant) with `<Link>` elements for proper routing.

**Alternative considered**: Sidebar navigation. Rejected — the pipeline editor already uses full horizontal width; a sidebar would compete with the canvas.

### 5. Chart library

**Decision**: Use shadcn's `chart` component which wraps Recharts, installed via `npx shadcn@latest add chart`.

**Why**: Consistent with the existing shadcn-based component library. Provides `ChartContainer`, `ChartTooltip`, `ChartLegend` primitives with built-in theme support. Recharts is a mature, well-documented library for React.

## Risks / Trade-offs

**[Large run count may produce heavy payload]** → For now, the endpoint returns all completed runs. If pipelines grow to thousands of runs, add `?limit=N` with a sensible default (e.g., 200). The API shape supports this without breaking changes.

**[Mixed metric types break charts]** → If a user captures a string metric like `reasoning: "The answer was good"`, it won't render on a numeric chart axis. This is the user's responsibility per the proposal. The chart component should gracefully skip non-numeric values rather than crashing.

**[graphSnapshot metric node detection is per-run]** → Each run's graphSnapshot must be inspected to find metric_capture nodes, which means the DB query can't simply filter by node type from the `pipelineNodes` table. The query joins `stepResults` and filters by `output->>'metrics'` being present, or the API iterates run snapshots server-side.

## Open Questions

None — decisions from explore mode cover the key tradeoffs.
