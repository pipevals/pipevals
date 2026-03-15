## 1. Database Schema & Dependencies

- [x] 1.1 Install `@xyflow/react` and `zustand` via bun
- [x] 1.2 Create Drizzle schema for `pipelines` table with id, name, description, organization_id, created_by, timestamps, and unique constraint on (name, organization_id)
- [x] 1.3 Create Drizzle schema for `pipeline_nodes` table with id, pipeline_id, type enum, label, config jsonb, position_x, position_y
- [x] 1.4 Create Drizzle schema for `pipeline_edges` table with id, pipeline_id, source_node_id, source_handle, target_node_id, target_handle, label
- [x] 1.5 Create Drizzle schema for `pipeline_runs` table with id, pipeline_id, status enum, trigger_payload jsonb, graph_snapshot jsonb, workflow_run_id, started_at, completed_at
- [x] 1.6 Create Drizzle schema for `step_results` table with id, run_id, node_id (plain text, not FK — references node ID within the run's graph_snapshot), status enum, input/output/error jsonb, duration_ms, started_at, completed_at, unique constraint on (run_id, node_id)
- [x] 1.7 Define Drizzle relations for all pipeline tables
- [x] 1.8 Generate and apply database migration

## 2. Shared Types & Utilities

- [x] 2.1 Define `StepType` enum and discriminated union types for node configs (ApiRequestConfig, AiSdkConfig, SandboxConfig, ConditionConfig, TransformConfig, MetricCaptureConfig)
- [x] 2.2 Define `StepInput` and `StepOutput` types and the `StepHandler` function signature
- [x] 2.3 Implement dot-path resolver utility (`resolveDotPath(obj, path) → value`) with error handling for unresolvable paths
- [x] 2.4 Implement graph validation utility: cycle detection (topological sort via Kahn's algorithm), condition node handle validation, DAG constraint checks, 50-node limit
- [x] 2.5 Add Zod schemas for each node config type to validate on API save
- [x] 2.6 Write unit tests for graph validation: cycle detection rejects cycles, accepts valid DAGs, condition node requires 2+ distinct handles, 50-node limit enforced, unique name constraint

## 3. Step Registry

- [x] 3.1 Create `lib/pipeline/steps/` directory structure with the registry entry point
- [x] 3.2 Implement `api_request` handler: resolve dot-path expressions in URL/body template, make HTTP request, return status + parsed body
- [x] 3.3 Implement `ai_sdk` handler: resolve prompt template, call generateText/generateObject via AI SDK, return text/object + usage + latencyMs
- [x] 3.4 Implement `sandbox` handler: pass resolved input to Vercel Sandbox, execute code, capture output, enforce timeout
- [x] 3.5 Implement `condition` handler: evaluate expression with comparison operators against resolved inputs, return `{ branch: "<handle>" }`
- [x] 3.6 Implement `transform` handler: resolve mapping of dot-path expressions, construct output object
- [x] 3.7 Implement `metric_capture` handler: resolve extract_path, return `{ metric, value }`
- [x] 3.8 Wire all handlers into the step registry record
- [x] 3.9 Write unit tests for `api_request` handler: successful call returns status + body, non-2xx throws error with status and body
- [x] 3.10 Write unit tests for `ai_sdk` handler: generateText returns text + usage + latencyMs, generateObject returns structured output when responseFormat configured
- [x] 3.11 Write unit tests for `sandbox` handler: successful execution returns output, timeout exceeded throws timeout error
- [x] 3.12 Write unit tests for `condition` handler: each comparison operator (==, !=, >, <, >=, <=), true and false branch selection
- [x] 3.13 Write unit tests for `transform` handler: resolves mapping of dot-paths, fails on unresolvable path
- [x] 3.14 Write unit tests for `metric_capture` handler: extracts value at dot-path, returns metric name and value

## 4. Graph Walker & Workflow

- [x] 4.1 Implement graph loader: deserialize graph from run's graph_snapshot jsonb, build adjacency structures (do NOT query live pipeline_nodes/edges)
- [x] 4.2 Implement topological sort with level grouping for parallel execution
- [x] 4.3 Implement input resolver: for each node, gather upstream outputs from results map using edge connections, build StepInput with `steps.<nodeId>` and `trigger` namespaces
- [x] 4.4 Implement conditional branch logic: after condition node evaluates, determine active edges, only enqueue downstream nodes on active branches
- [x] 4.5 Implement step result recording: insert/update step_results rows with status transitions (running → completed/failed), capture input, output, error, duration_ms
- [x] 4.6 Implement run status management: update pipeline_runs status (pending → running → completed/failed) with timestamps
- [x] 4.7 Create the Vercel Workflow definition (`run-pipeline`) that orchestrates the full walk: load graph → sort → walk levels → dispatch to registry → record results
- [x] 4.8 Write unit tests for topological sort: linear chain, fan-out parallelism, fan-in waits for all upstream
- [x] 4.9 Write unit tests for input resolution: resolve `steps.<nodeId>.<path>`, resolve `trigger.<path>`, unresolvable path throws descriptive error
- [x] 4.10 Write unit tests for conditional branching: true branch taken / false branch skipped, convergence after condition (merge node with mixed active/inactive incoming edges executes without waiting for inactive path)
- [x] 4.11 Write unit tests for dot-path resolver: nested paths, missing intermediate keys, null values

## 5. Pipeline REST API

- [x] 5.1 Create `POST /api/pipelines` route: validate input, create pipeline scoped to user's organization
- [ ] 5.2 Create `GET /api/pipelines` route: list pipelines for user's organization
- [ ] 5.3 Create `GET /api/pipelines/:id` route: return pipeline with nodes and edges in xyflow-compatible shape, return 404 for missing or wrong-org pipelines
- [ ] 5.4 Create `PUT /api/pipelines/:id` route: validate DAG, upsert nodes and edges with stable client-generated IDs (insert new, update existing, delete removed) in a transaction
- [ ] 5.5 Create `DELETE /api/pipelines/:id` route: cascade delete pipeline and all related data
- [ ] 5.6 Create `POST /api/pipelines/:id/runs` route: load current graph, serialize as graph_snapshot, create run row with snapshot, validate pipeline has nodes, trigger Vercel Workflow, return 202 with runId (400 if pipeline is empty)
- [ ] 5.7 Create `GET /api/pipelines/:pipelineId/runs` route: list runs ordered by most recent
- [ ] 5.8 Create `GET /api/pipelines/:pipelineId/runs/:runId` route: return run status with all step_results
- [ ] 5.9 Add auth middleware: all routes require authenticated user with active organization
- [ ] 5.10 Write integration tests for pipeline CRUD: 201 on create, 409 on duplicate name, 200 on list, 200 on get with graph, 404 on missing pipeline, 200 on valid PUT, 400 on cyclic graph, 400 on oversized graph, 204 on delete
- [ ] 5.11 Write integration tests for run endpoints: 202 on trigger with payload, 400 on trigger empty pipeline, 200 on get run status with step_results, 200 on list runs ordered by recent
- [ ] 5.12 Write integration tests for auth: 401 on unauthenticated requests across all routes

## 6. Pipeline Builder UI

- [ ] 6.1 Create zustand store for pipeline builder state: nodes, edges, selected node, dirty flag, save/load actions
- [ ] 6.2 Create the xyflow canvas component with pan, zoom, and minimap
- [ ] 6.3 Create custom node components for each step type with typed input/output handles (condition nodes get multiple labeled output handles)
- [ ] 6.4 Create the node palette sidebar with draggable step type entries
- [ ] 6.5 Implement drag-from-palette-to-canvas to create new nodes with default config
- [ ] 6.6 Implement edge creation with cycle prevention (validate before accepting connection)
- [ ] 6.7 Implement node and edge deletion: select node/edge and press delete/backspace to remove, deleting a node removes all connected edges
- [ ] 6.8 Create the node configuration panel: renders type-specific form fields when a node is selected
- [ ] 6.9 Wire save/load: save button persists graph via PUT API, page load fetches via GET API
- [ ] 6.10 Create the pipeline list page with create/delete actions
- [ ] 6.11 Create the pipeline editor page layout: palette sidebar + canvas + config panel

## 7. Pipeline Run Viewer

- [ ] 7.1 Create the run viewer canvas: render graph from run's graph_snapshot (not live pipeline), read-only (no drag, no edge creation)
- [ ] 7.2 Add status badge overlays to nodes based on step_results (pending, running, completed, failed, skipped)
- [ ] 7.3 Add edge highlighting: traversed edges highlighted, inactive branch edges dimmed
- [ ] 7.4 Implement node click → result inspection panel showing input, output, error, duration
- [ ] 7.5 Implement polling: fetch run status every 2s while status is pending/running, stop on terminal status
- [ ] 7.6 Create run summary panel: overall status, total duration, step counts, captured metrics
- [ ] 7.7 Create the run list page for a pipeline with status indicators and trigger-run button
- [ ] 7.8 Create the run detail page layout: canvas + summary panel + inspection panel
