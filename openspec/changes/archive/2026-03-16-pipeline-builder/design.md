## Context

Pipevals has authentication (Better Auth + GitHub OAuth, organizations), a PostgreSQL database with Drizzle ORM (auth schema only), and Vercel Workflow wired in via `withWorkflow` but no workflows defined. The tech stack includes xyflow and zustand as planned dependencies, not yet installed. There is no domain model — no tables, no API routes, no UI beyond the sign-in page.

This design covers the first major feature: a visual pipeline builder that lets teams design evaluation pipelines as directed acyclic graphs, persist them in PostgreSQL, and execute them durably via Vercel Workflow with results piped between steps.

## Goals / Non-Goals

**Goals:**

- Define a database schema that serves both xyflow rendering and Workflow execution without translation layers
- Support heterogeneous step types (API requests, AI SDK calls, sandbox executions) behind a common interface
- Handle fan-out (parallel branches), fan-in (merge), and conditional branching in the graph walker
- Pipe data between steps using dot-path expressions on the output of upstream nodes
- Record per-step execution state so runs can be observed in real-time
- Keep the step registry extensible — adding a new step type should require one file

**Non-Goals:**

- Loops / cycles in pipelines (DAGs only — eval pipelines are acyclic by nature)
- Visual diff of pipeline versions (future work, not v1)
- Collaborative real-time editing of the same pipeline (single-user editing is sufficient)
- Custom user-authored code steps beyond the sandbox step type (arbitrary code runs in the sandbox, not inline)
- Dataset iteration / batch runs (a pipeline runs once per trigger; batching is a separate concern)

## Decisions

### 1. Single graph model for UI and execution

**Decision**: `pipeline_nodes` and `pipeline_edges` tables store the canonical graph. xyflow reads/writes them directly (with position fields), and the graph walker reads the same rows at execution time.

**Why over separate models**: Eliminates a sync/translation layer. The xyflow `Node` shape (`id`, `type`, `position`, `data`) maps almost 1:1 to the DB row. Adding `position_x`/`position_y` columns to the execution model is cheap; maintaining two models in sync is expensive.

**Alternative considered**: Separate `pipeline_definitions` (visual) and `pipeline_steps` (execution) tables. Rejected because any schema drift between them causes silent execution bugs.

### 2. Polymorphic jsonb config per node type

**Decision**: Each `pipeline_node` has a `type` enum and a `config` jsonb column whose shape is determined by the type. TypeScript discriminated unions enforce the type at the application layer.

**Why over separate config tables**: A single table with jsonb is simpler to query, index, and migrate. The config shapes are small (5-10 fields) and always loaded together with the node. Separate tables per type (e.g., `ai_sdk_configs`, `api_request_configs`) would mean N joins to load a pipeline.

**Alternative considered**: A generic key-value config table. Rejected because it loses structure and makes validation harder.

### 3. Dot-path expressions for input resolution

**Decision**: When a node references upstream data, it uses dot-path expressions like `steps.nodeId.response.text`. At execution time, the graph walker resolves these against a results map (`Record<nodeId, output>`). Complex transformations use the `transform` step type which can apply jq-like mappings.

**Why over full template engine**: Dot-path is simple, predictable, and sufficient for piping structured JSON between steps. A template engine (Handlebars, Liquid) adds parser complexity and security surface. jq can be introduced later as a `transform` node option for power users without changing the piping model.

**Resolution format**: `steps.<nodeId>.<path>` where `<path>` is a dot-separated key path into that node's output. For fan-in nodes receiving multiple inputs, all upstream outputs are available by their source node ID.

### 4. Graph walker as a single Vercel Workflow

**Decision**: One workflow definition (`run-pipeline`) that dynamically walks any pipeline graph. It loads the graph from DB, topologically sorts it, and executes nodes level-by-level using `step.run()` per node. Parallel nodes at the same level use `Promise.all`.

**Why over compiled/generated workflows**: A single interpreter workflow means zero code generation, instant pipeline changes (edit graph → next run uses it), and a single place to debug execution logic. Generated workflows would need a build step and wouldn't pick up graph changes until regenerated.

**Step naming**: Each `step.run()` is named `node-${nodeId}` which is deterministic and unique per graph. On Workflow replay after a crash, cached steps return instantly and execution resumes at the next uncached node.

**Conditional branching**: Condition nodes evaluate their expression against inputs and record which output handle is active. The walker only enqueues downstream nodes whose incoming edge's `source_handle` matches the active handle. Inactive branches are never executed.

### 5. Step registry as a typed record

**Decision**: A `stepRegistry` object maps `StepType` enum values to handler functions with the signature `(config: T, input: StepInput) => Promise<StepOutput>`. Each step type is a separate file in `lib/pipeline/steps/`.

**Why over class hierarchy**: Functions are simpler, easier to test, and don't need instantiation. The registry is a plain object — no DI container, no class registration. Adding a step is: write a handler function, add it to the registry, add its config type to the discriminated union.

### 6. zustand store for pipeline builder state

**Decision**: A zustand store manages the client-side pipeline builder state (nodes, edges, selected node, config panel state). It syncs bidirectionally with xyflow's internal state via `onNodesChange`/`onEdgesChange` callbacks and with the server via save/load API calls.

**Why over React state or xyflow's built-in state**: zustand provides a single source of truth outside the React tree, supports selectors for performance (only re-render components that depend on changed slices), and xyflow internally uses zustand so the mental model aligns. React useState/useReducer would scatter state across components and make persistence harder.

### 7. Graph snapshot on run creation

**Decision**: When a pipeline run is triggered, the full graph (nodes + edges with all configs and positions) is serialized as jsonb into a `graph_snapshot` column on the `pipeline_runs` row. The graph walker and run viewer both read from this snapshot, never from the live `pipeline_nodes`/`pipeline_edges` tables. The `step_results.node_id` column is plain text (not a foreign key to `pipeline_nodes`) — it references a node ID within the snapshot.

**Why**: The live pipeline graph is mutable (users edit it in the builder). Without a snapshot, editing a pipeline while a run is in progress causes FK cascade deletes on in-flight step_results, orphaned references, and incoherent run viewer state. The snapshot decouples run execution from live edits — a run is fully self-contained.

**Why jsonb over snapshot tables**: A 50-node graph is ~50KB of JSON — negligible. A single column avoids two extra tables, FK remapping, and copy logic. The snapshot is loaded once at run start and never queried structurally. If pipeline versioning is needed later, snapshot data can be used to backfill version history.

**Stable node IDs**: The PUT API preserves client-generated node IDs (xyflow generates these). Nodes are upserted, not delete-and-recreated, so IDs remain stable across edits. This enables future partial re-runs by correlating nodes between snapshots.

### 8. Step results recorded during execution

**Decision**: The graph walker writes a `step_results` row for each node as it executes (status: running → completed/failed). This gives the run viewer live observability by polling the DB.

**Why over post-hoc logging**: Writing results as-we-go means a crashed run still has partial results. The run viewer can show "3 of 7 steps completed" without waiting for the workflow to finish. Combined with Vercel Workflow's durability, you always know exactly where a run is.

**Future**: Replace polling with real-time subscriptions (Postgres LISTEN/NOTIFY or WebSocket) when latency matters.

## Risks / Trade-offs

**[Large pipeline graphs could hit Vercel Workflow step limits]** → Vercel Workflow has a max number of steps per run. For v1, eval pipelines are typically 5-20 nodes which is well within limits. If users build 100+ node pipelines, we'd need to chunk execution or use sub-workflows. Mitigation: validate graph size before execution, set a reasonable node limit (e.g., 50).

**[jsonb config is not validated at the DB level]** → Invalid config could cause runtime crashes. Mitigation: Zod schemas per step type validate config on save (in the API layer) and on load (in the graph walker). The DB is the store, not the validator.

**[Dot-path expressions could reference nonexistent paths]** → A typo in `steps.node1.respons.text` would produce `undefined`. Mitigation: validate expressions at save time by checking that referenced node IDs exist in the graph and that the path structure matches the source node's output schema (where known). Runtime: fail the step explicitly with a clear error rather than passing `undefined` downstream.

**[Fan-in timing with parallel branches]** → The walker must wait for all upstream nodes before executing a fan-in node. The level-by-level approach handles this naturally (a node is only enqueued when all its incoming edges are satisfied). Risk: if one parallel branch is much slower than others, the fan-in node blocks. This is correct behavior for eval pipelines (you need all scores before aggregating).

**[No pipeline versioning in v1]** → Editing a pipeline changes it for future runs. The graph snapshot on each run ensures past runs are unaffected by edits, but there is no first-class version history for the pipeline definition itself. Mitigation: version history can be reconstructed from accumulated run snapshots if needed. A future change could add explicit pipeline versioning.

## Open Questions

- **Sandbox runtime**: Which sandbox provider to use for the `sandbox` step type? Options include Vercel Sandbox (microVM), E2B, or a self-hosted container. This can be deferred — the step registry abstraction means the handler is swappable.
- **Pipeline templates**: Should there be pre-built pipeline templates (e.g., "basic LLM eval", "comparative eval") to get users started quickly? Useful for UX but not architecturally significant — just seed data.
- **Rate limiting on pipeline runs**: Should there be org-level limits on concurrent pipeline runs? Probably yes for cost control, but the mechanism is separate from the pipeline engine itself.
