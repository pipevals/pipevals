## Why

The pipeline walker — graph loading, topological sorting, branch resolution, input resolution, and the Vercel Workflow orchestration loop — is generic infrastructure that other Vercel-deployed Next.js projects need. Today it's embedded in pipevals with direct Drizzle imports and pipevals-specific DB schema references. Extracting it into a publishable npm package lets other projects reuse the same durable DAG execution engine without reimplementing the ~500 lines of graph algorithms and orchestration logic.

## What Changes

- Extract the walker's pure graph algorithms (graph-loader, topological-sort, branch-resolver, input-resolver, dot-path) into a standalone npm package with zero pipevals coupling
- Extract the Vercel Workflow orchestration loop (`workflow.ts`) into the same package, parameterized by adapter interfaces the consumer provides
- Define a `PersistenceAdapter` interface so consumers supply their own storage (Drizzle, Prisma, in-memory, etc.)
- Define a `StepRegistry` type so consumers register their own step handlers
- Define a `HookAdapter` interface so consumers can implement suspendable step types (human review, approval gates, external webhooks)
- Refactor pipevals to consume the extracted package, implementing the adapters with its existing Drizzle schema
- Step handler implementations (ai_sdk, api_request, sandbox, condition, transform, metric_capture) remain in pipevals — consumers bring their own handlers via the `StepRegistry` type
- **BREAKING**: The walker module moves from `lib/pipeline/walker/` to an external dependency; internal imports change

## Capabilities

### New Capabilities
- `walker-package`: The publishable npm package structure, exports, build configuration, and the factory function (`createWalker`) that accepts adapters and returns a Vercel Workflow function
- `walker-adapters`: The adapter interfaces (PersistenceAdapter, StepRegistry, HookAdapter) that decouple the walker from any specific persistence layer or step set
- `walker-spike`: Minimal proof-of-concept verifying that `"use workflow"` / `"use step"` directives in an npm package are correctly compiled by a consuming app's `withWorkflow()`, including closure capture and hook suspension

### Modified Capabilities
- `graph-walker`: Implementation moves from inline code to consuming the extracted package via adapters. All behavioral requirements remain identical.
- `step-registry`: The registry type becomes generic (string keys instead of a DB-sourced enum). The pipevals-specific registry remains as the consumer-side implementation.
- `human-review-step`: The hook-based suspension mechanism is generalized into the `HookAdapter` interface. Pipevals implements the adapter with its existing tasks table and review aggregation logic.

## Impact

- **New package**: A new npm package (working name: `@pipevals/workflow-walker` or similar) with its own `package.json`, `tsconfig.json`, and build setup
- **Moved files**: `lib/pipeline/walker/workflow.ts`, `walker/graph-loader.ts`, `walker/topological-sort.ts`, `walker/branch-resolver.ts`, `walker/input-resolver.ts`, and `lib/pipeline/dot-path.ts` move into the package. Step handlers, step-recorder, and human-review stay in pipevals.
- **New adapter files in pipevals**: `lib/pipeline/walker-adapters.ts` (or similar) implementing `PersistenceAdapter` and `HookAdapter` against the existing Drizzle schema
- **Dependencies**: The package peer-depends on `workflow` (Vercel Workflow SDK) and depends on `lodash.get`. No handler-specific peer deps.
- **Build**: Consumers must use `withWorkflow()` in their Next.js config (already required for any Vercel Workflow usage)
- **Risk**: The SWC plugin's handling of `"use step"` closure capture over injected adapters needs verification via the spike before full implementation
