## Why

Pipevals lets users build evaluation pipelines, but each run must be triggered individually with a single payload. There is no way to run a pipeline against a set of inputs, group the results, or reuse test data across runs. Users cannot do "evals at scale" — the core value prop of an evaluation platform.

## What Changes

- Introduce **Dataset** as a standalone, first-class entity — a named, reusable collection of test cases scoped to an organization
- Introduce **Dataset Items** — individual rows within a dataset, each holding a JSON payload that conforms to the dataset's schema
- Introduce **Eval Run** — a single evaluation execution that runs a pipeline against all items in a dataset, grouping the resulting pipeline runs for aggregate analysis
- Add a nullable `evalRunId` foreign key to existing pipeline runs, linking individual runs to their parent eval run when triggered via a dataset
- Add dataset CRUD API and UI (list, create, view/edit items, delete)
- Add eval run triggering (select a dataset, fire N pipeline runs) and eval run results UI (aggregate metrics scoped to the eval run, plus per-item drill-down)

## Capabilities

### New Capabilities
- `dataset-api`: CRUD endpoints for datasets and dataset items (create, list, get, update, delete datasets; add/remove/bulk-upload items)
- `dataset-ui`: Dataset management pages — list of datasets, dataset detail with items table, upload/paste items interface
- `eval-run-api`: Trigger an eval run (pipeline × dataset), list eval runs for a pipeline, get eval run detail with aggregate metrics and per-item results
- `eval-run-ui`: Eval run triggering (dataset picker on pipeline page), eval run list, eval run detail with aggregate metrics and per-item drill-down

### Modified Capabilities
- `pipeline-api`: Pipeline runs gain a nullable `evalRunId` FK; runs list endpoint supports filtering by eval run
- `pipeline-metrics-api`: Metrics aggregation supports scoping to a specific eval run (in addition to all-runs aggregation)

## Impact

- **Database**: New `datasets`, `datasetItems`, `evalRuns` tables in drizzle schema; `pipelineRuns` table gains nullable `evalRunId` column
- **API**: New route groups under `/api/datasets/` and `/api/pipelines/[id]/eval-runs/`; minor filter additions to existing runs and metrics endpoints
- **UI**: New top-level "Datasets" nav entry; new eval run surfaces on pipeline pages; dataset picker component
- **Execution core**: Untouched — walker, step handlers, input resolver, human review flow all remain as-is; eval runs simply create N standard pipeline runs
