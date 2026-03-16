## Why

Pipevals is an LLM evaluation platform, but it currently has no way to define, store, or execute evaluation pipelines. Teams need to compose heterogeneous operations — API calls, AI SDK invocations, sandbox executions — into directed graphs that pipe data through scoring and analysis steps to capture metrics. These pipelines must be visually designable, persisted in the database, and durably executed at runtime. Without this, there is no core product.

## What Changes

- Introduce a database-backed pipeline graph model (nodes + edges) using Drizzle + PostgreSQL that stores pipeline definitions and execution state
- Build a visual pipeline builder UI using xyflow where users drag step types from a palette, connect them, and configure each node
- Implement a step registry that maps step types (`api_request`, `ai_sdk`, `sandbox`, `condition`, `transform`, `metric_capture`) to executable handlers
- Create a graph walker that loads a pipeline from the database and executes it durably via Vercel Workflow, walking nodes level-by-level with fan-out parallelism and conditional branching
- Add a data-piping system using dot-path expressions (with jq as a future option) so each node's output feeds into downstream nodes' inputs
- Expose a REST API to trigger pipeline runs and query run status/results
- Support a run viewer mode on the same xyflow canvas that overlays live execution status on the pipeline graph

## Capabilities

### New Capabilities

- `pipeline-graph-model`: Database schema and data access layer for pipelines, nodes, edges, runs, and step results
- `pipeline-builder-ui`: xyflow-based visual editor for designing pipelines — node palette, canvas, node configuration panels, conditional edge routing
- `step-registry`: Typed catalog of step implementations (api_request, ai_sdk, sandbox, condition, transform, metric_capture) with a common handler interface
- `graph-walker`: Engine that compiles a database-stored pipeline graph into a Vercel Workflow execution — topological ordering, fan-out/fan-in, conditional branching, input resolution via dot-path piping
- `pipeline-api`: REST endpoints to trigger pipeline runs, query run status, and retrieve step results
- `pipeline-run-viewer`: Read-only xyflow view of a running/completed pipeline with per-node status badges, input/output inspection, and live progress

### Modified Capabilities

*(none — no existing specs)*

## Impact

- **Database**: New tables: `pipelines`, `pipeline_nodes`, `pipeline_edges`, `pipeline_runs`, `step_results`. Migration required.
- **Dependencies**: Add `@xyflow/react`, `zustand` (for pipeline builder state). Both already planned in tech stack.
- **API surface**: New route group under `/api/pipelines/` for CRUD + run triggers.
- **Vercel Workflow**: First real workflow definition in the project — the graph walker.
- **Auth**: Pipeline operations scoped to organizations via existing Better Auth + organization plugin.

