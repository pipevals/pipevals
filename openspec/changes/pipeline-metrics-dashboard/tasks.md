## 1. Dependencies & UI Primitives

- [x] 1.1 Install recharts and add shadcn chart component (`npx shadcn@latest add chart`)
- [x] 1.2 Verify chart component renders with a smoke test (import in a page, confirm no build errors)

## 2. Metrics API Endpoint

- [x] 2.1 Create `GET /api/pipelines/:id/runs/metrics` route handler — query `pipelineRuns` joined with `stepResults`, filter completed runs, extract metric_capture outputs from graphSnapshot + step results, compute run `durationMs`, return `{ runs: [...] }` ordered by `createdAt` ascending
- [x] 2.2 Write tests for the metrics endpoint: pipeline with completed runs, pipeline with no runs, multiple metric_capture nodes merged, step durations included, unauthenticated returns 401

## 3. Pipeline Sub-Navigation

- [x] 3.1 Create a `PipelineSubNav` component with links to Editor (`/pipelines/:id`), Metrics (`/pipelines/:id/metrics`), and Runs (`/pipelines/:id/runs`), using active state based on current path
- [x] 3.2 Add `PipelineSubNav` to the pipeline editor page, runs list page, and run detail page

## 4. Metrics Page — Layout & Data Fetching

- [x] 4.1 Create page at `app/pipelines/[id]/metrics/page.tsx` — server component with auth check, renders `AppHeader` + `PipelineSubNav` + client metrics content component
- [x] 4.2 Create client component `MetricsDashboard` that fetches from `/api/pipelines/:id/runs/metrics` via SWR and computes aggregates (total runs, pass rate, avg metric, avg duration, metric name union)

## 5. Stat Cards

- [x] 5.1 Build stat cards row: total runs, pass rate (%), average value of first numeric metric, average run duration — using shadcn `Card` components

## 6. Metric Trends Chart

- [x] 6.1 Build area chart component using `ChartContainer` + Recharts `AreaChart` — one `<Area>` per numeric metric, with `ChartTooltip` and `ChartLegend`
- [x] 6.2 Add x-axis `ToggleGroup` (By run / By time) that switches the x-axis key between run index and `createdAt` timestamp
- [x] 6.3 Handle non-numeric metric values gracefully (skip data points without crashing the chart)

## 7. Score Distribution Chart

- [x] 7.1 Build vertical bar chart component for histogram — bucket values of a selected metric, display frequency per bucket
- [x] 7.2 Add metric selector dropdown above the histogram to choose which metric to visualize

## 8. Step Duration Chart

- [ ] 8.1 Build horizontal bar chart component showing average `durationMs` per step label across all runs, ordered by duration descending

## 9. Recent Runs Table

- [ ] 9.1 Build mini-table showing last 10 runs with columns: Run ID, Status, inline metric values, Duration — with "View all" link to `/pipelines/:id/runs`
