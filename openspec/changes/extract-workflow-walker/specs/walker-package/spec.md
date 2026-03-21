## ADDED Requirements

### Requirement: Package exports and entry points

The package SHALL export the following from a single main entry point:
- `createWalker` factory function
- All core types: `WalkerNode`, `WalkerEdge`, `PipelineGraph`, `GraphSnapshot`, `StepInput`, `StepOutput`, `StepHandler`
- All adapter interfaces: `PersistenceAdapter`, `StepRegistry`, `HookAdapter`
- Pure graph utilities: `loadGraph`, `topologicalSort`, `BranchResolver`, `resolveInputs`
- Dot-path utilities: `resolveDotPath`, `resolveTemplate`, `DotPathError`

The package SHALL NOT export step handler implementations. Consumers bring their own handlers via the `StepRegistry` type.

#### Scenario: Consumer imports core and types

- **WHEN** a consumer imports `{ createWalker, type StepHandler, type PersistenceAdapter }` from the main entry point
- **THEN** all types and the factory are available with no additional sub-path imports needed

#### Scenario: Consumer uses graph utilities standalone

- **WHEN** a consumer imports `{ loadGraph, topologicalSort }` from the main entry point
- **THEN** they can load and sort a graph without using the full walker factory

### Requirement: createWalker factory function

The package SHALL export a `createWalker` function that accepts a configuration object with `persistence` (required), `steps` (required), and `hooks` (optional) properties, and returns an async function compatible with Vercel Workflow's `start()`.

The returned function SHALL carry the `"use workflow"` directive and implement the full orchestration loop: load run data, topological sort, level-by-level execution with branch resolution, and final status update.

#### Scenario: Create walker with minimal config

- **WHEN** `createWalker({ persistence: myAdapter, steps: myRegistry })` is called
- **THEN** it returns a function `(runId: string) => Promise<Record<string, Record<string, unknown>>>` that can be passed to `start()`

#### Scenario: Create walker with hook adapter

- **WHEN** `createWalker({ persistence, steps, hooks: myHookAdapter })` is called
- **THEN** the returned workflow function delegates suspendable nodes to `hooks.executeSuspendable()` instead of the normal step execution path

#### Scenario: Walker without hook adapter skips suspension

- **WHEN** `createWalker` is called without a `hooks` property
- **THEN** all nodes are executed through the normal step registry path; no suspension occurs

### Requirement: Package peer dependencies

The package SHALL declare `workflow` as a peer dependency (compatible with `^4.x`). The package SHALL declare `lodash.get` as a direct dependency. The package SHALL NOT depend on `drizzle-orm`, `postgres`, `better-auth`, `ai`, `@vercel/sandbox`, or any pipevals-specific or handler-specific package.

#### Scenario: Consumer installs package

- **WHEN** a consumer installs the package in a project that already has `workflow` installed
- **THEN** no additional peer dependency warnings are raised

### Requirement: Package build output

The package SHALL be built as ESM with TypeScript declaration files. The package SHALL include source maps for debugging.

#### Scenario: Consumer in a Next.js project

- **WHEN** a Next.js app with `withWorkflow()` in its config imports the package
- **THEN** the Workflow SWC plugin transforms `"use workflow"` and `"use step"` directives in the package's compiled output
