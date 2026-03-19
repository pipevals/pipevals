## Context

Pipevals is an LLM evaluation platform where users build DAG-based evaluation pipelines and trigger runs against them. Today, each run is triggered individually with a single JSON payload. There is no way to run a pipeline against a collection of inputs, group the resulting runs, or reuse test data. This limits Pipevals to ad-hoc single-case evaluation rather than systematic benchmarking.

The execution core (walker, step handlers, input resolver, human review) operates on individual runs and does not need to change. Datasets and eval runs are a layer above the execution engine.

## Goals / Non-Goals

**Goals:**
- Introduce Dataset as a standalone, org-scoped entity with a JSON schema and a collection of items
- Introduce Eval Run as the grouping concept that links a pipeline execution to a dataset, creating one pipeline run per item
- Provide CRUD APIs and UI for managing datasets and their items
- Provide eval run triggering, listing, and aggregate metrics scoped to an eval run
- Keep the existing single-run trigger path working unchanged

**Non-Goals:**
- Dataset versioning (tracking changes to a dataset over time)
- Pipeline versioning or pipeline-vs-pipeline comparison on the same dataset
- Scheduled/recurring eval runs (nightly evals, CI integration)
- Smart schema compatibility (superset matching, coercion) — start with exact match, defer to when production use cases inform the rules
- Dataset import from external sources (CSV upload, API sync) — the initial UI accepts JSON; file upload is a follow-up

## Decisions

### 1. Datasets are standalone (not scoped to a pipeline)

A dataset has its own schema and belongs to an organization, not to a specific pipeline. Any pipeline whose triggerSchema matches the dataset's schema can run against it.

**Why over scoping to a pipeline:** Pipeline-scoped datasets would prevent reusing the same test cases across pipeline iterations or different eval approaches. The "compare v1 vs v2 on the same data" use case — core to evaluation workflows — requires datasets to be independent.

**Trade-off:** Requires a schema compatibility check at eval-run trigger time. Start with strict equality (dataset schema keys must exactly match pipeline triggerSchema keys). This is simple and avoids false positives. Relax later based on real usage.

### 2. Items stored in a child table, not JSONB array

Dataset items are rows in a `dataset_item` table (one row per item), not a JSONB array on the dataset row.

**Why over JSONB array:** Individual rows allow pagination, partial updates, and scale to large datasets without loading everything into memory. It also enables future features like per-item tagging or expected-output annotations without schema changes.

**Alternative considered:** JSONB array is simpler for small datasets (< 100 items) but creates problems at scale — every edit rewrites the entire array, no pagination, no indexing on item content.

### 3. Eval Run as a lightweight grouping entity

A new `eval_run` table links a pipeline to a dataset and groups the resulting pipeline runs. Individual `pipeline_run` rows gain a nullable `evalRunId` FK.

**Why a separate table over just a batchId string:** A proper entity allows storing aggregate status (pending/running/completed/failed), timestamps, and metadata. It also provides a stable reference for the eval run detail page and metrics scoping.

**Existing single-run path:** Runs with `evalRunId = null` continue to work exactly as before. No migration of existing data needed.

### 4. Eval run creates N standard pipeline runs

The eval run trigger endpoint iterates over dataset items and creates one `pipeline_run` per item using the same logic as the existing single-run trigger (snapshot graph, create run, start workflow). The graph is snapshotted once and shared across all runs in the eval.

**Why over a batch workflow:** Reusing the existing per-run workflow means the walker, step handlers, human review, and all execution logic remain untouched. Each run is independent and can succeed or fail individually.

**Concurrency:** All N workflows are started concurrently via `Promise.all`. Vercel Workflow handles its own concurrency limits. For v1, no application-level throttling.

### 5. Schema compatibility is strict equality for now

At eval-run trigger time, the system checks that the dataset's schema keys exactly match the pipeline's triggerSchema keys. If they don't match, the trigger is rejected with a 400.

**Why:** No production use cases exist yet to inform what "compatible" means. Strict equality is safe, simple, and easy to relax later. The check is isolated to the eval-run trigger endpoint.

### 6. Nav structure: Datasets as a top-level section

Datasets appear as a top-level nav item alongside Pipelines. The pipeline detail page gains an "Eval Runs" tab/section alongside the existing "Runs" and "Metrics" sections.

**Why over nesting under pipelines:** Datasets are standalone entities. Nesting them under pipelines would imply ownership that doesn't exist in the data model. A top-level section also makes "dataset-first" workflows natural (browse datasets, then pick a pipeline to evaluate against).

## Risks / Trade-offs

**[N concurrent workflows per eval run]** Large datasets (100+ items) will fire 100+ workflows simultaneously. Vercel Workflow should handle this, but untested at scale. **Mitigation:** Monitor in practice. Add throttling (e.g., batches of 20) if needed — this is an implementation detail that doesn't affect the data model.

**[Orphaned eval runs]** If some workflows fail to start, the eval run has partial coverage. **Mitigation:** The eval run status is derived from its child runs. If any fail, the eval run shows as failed with per-item drill-down showing which items succeeded/failed.

**[Schema drift]** A user edits a pipeline's triggerSchema after creating a dataset. The dataset becomes incompatible. **Mitigation:** This is expected — the schema check at trigger time catches it with a clear error message. No silent failures.

**[No pagination on items API for v1]** The items list endpoint returns all items. Fine for datasets under ~500 items. **Mitigation:** Add cursor pagination when a real user hits this limit.
