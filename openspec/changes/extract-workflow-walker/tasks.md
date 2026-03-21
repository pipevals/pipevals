## 1. Spike — Verify SWC + Closure + Hook Assumptions

- [ ] 1.1 Create a minimal package (`spike-walker-pkg/`) with a `createWalker` factory that returns a `"use workflow"` function containing a `"use step"` function that calls an adapter via closure
- [ ] 1.2 Create a minimal Next.js test app (`spike-walker-app/`) with `withWorkflow()` that installs the spike package and calls `start()` on the factory-produced function from an API route
- [ ] 1.3 Verify `next build` succeeds — SWC plugin finds and transforms directives in the package
- [ ] 1.4 Verify step execution — trigger a workflow run and confirm the `"use step"` function calls the adapter method via closure with correct arguments
- [ ] 1.5 Verify step replay — kill and restart the workflow, confirm completed steps return cached results and subsequent steps still access the adapter
- [ ] 1.6 Verify hook suspension — add a `defineHook` call in the package's workflow function, confirm the workflow suspends and resumes when `resumeHook` is called from the test app
- [ ] 1.7 Document go/no-go result; if closure capture fails, document the failure mode and recommend fallback approach

## 2. Package Scaffolding

- [ ] 2.1 Create the package repo with `package.json` (name, peer dep on `workflow ^4.x`, direct dep on `lodash.get`), `tsconfig.json` (ESM output with declarations), and build script
- [ ] 2.2 Define `package.json` `exports` map with single main entry point
- [ ] 2.3 Set up the source directory structure: `src/core/`, `src/index.ts`

## 3. Core Graph Modules

- [ ] 3.1 Move `graph-loader.ts` into `src/core/graph-loader.ts` — replace `StepType` import with generic string type on `WalkerNode.type`
- [ ] 3.2 Move `topological-sort.ts` into `src/core/topological-sort.ts` — no changes needed (already pure)
- [ ] 3.3 Move `branch-resolver.ts` into `src/core/branch-resolver.ts` — update `WalkerNode`/`WalkerEdge` imports to local core types
- [ ] 3.4 Move `input-resolver.ts` into `src/core/input-resolver.ts` — update imports to local core types
- [ ] 3.5 Move `dot-path.ts` into `src/core/dot-path.ts` — no changes needed (only depends on `lodash.get`)

## 4. Adapter Interfaces and Types

- [ ] 4.1 Define `PersistenceAdapter` interface in `src/adapters.ts` with all 5 methods (`loadRunData`, `updateRunStatus`, `recordStepRunning`, `recordStepCompleted`, `recordStepFailed`)
- [ ] 4.2 Define `HookAdapter` interface in `src/adapters.ts` with `shouldSuspend` and `executeSuspendable`
- [ ] 4.3 Define `StepRegistry` type, `StepHandler`, `StepInput`, `StepOutput`, `GraphSnapshot` in `src/types.ts`
- [ ] 4.4 Define `WalkerConfig` type (`{ persistence, steps, hooks? }`) in `src/types.ts`

## 5. Walker Factory

- [ ] 5.1 Implement `createWalker(config: WalkerConfig)` in `src/walker.ts` — returns an async function with `"use workflow"` that implements the orchestration loop using adapter methods
- [ ] 5.2 Implement the `executeNode` function inside the walker that calls `persistence.recordStepRunning`, invokes the handler from the registry, and calls `persistence.recordStepCompleted` or `recordStepFailed` — all within `"use step"`
- [ ] 5.3 Implement the suspension routing: before registry lookup, check `hooks?.shouldSuspend(node)` and delegate to `hooks.executeSuspendable()` if true
- [ ] 5.4 Wire up the main entry point `src/index.ts` exporting `createWalker`, all types, all core utilities

## 6. Package Build and Publish

- [ ] 6.1 Verify the package builds cleanly with TypeScript declarations and source maps
- [ ] 6.2 Publish initial version to npm (or private registry)

## 7. Pipevals Integration

- [ ] 7.1 Install the walker package as a dependency in pipevals
- [ ] 7.2 Create `lib/pipeline/persistence-adapter.ts` implementing `PersistenceAdapter` with existing Drizzle queries from `steps.ts` and `step-recorder.ts`
- [ ] 7.3 Create `lib/pipeline/hook-adapter.ts` implementing `HookAdapter` — `shouldSuspend` checks `type === "human_review"`, `executeSuspendable` contains the existing three-phase human review logic (`reviewHook`, `aggregateReviews`, task creation)
- [ ] 7.4 Update `lib/pipeline/steps/registry.ts` to construct a `StepRegistry` (from the package type) alongside the existing `StepDefinition` registry used by the builder UI
- [ ] 7.5 Replace the inline `runPipelineWorkflow` in `lib/pipeline/walker/workflow.ts` with `createWalker({ persistence, steps, hooks })` from the package
- [ ] 7.6 Update API routes (`app/api/pipelines/[id]/runs/route.ts`, `app/api/pipelines/[id]/eval-runs/route.ts`) to import the walker from the new location
- [ ] 7.7 Remove the old walker files that are now in the package (`walker/workflow.ts`, `walker/graph-loader.ts`, `walker/topological-sort.ts`, `walker/branch-resolver.ts`, `walker/input-resolver.ts`, `walker/steps.ts`, `dot-path.ts`). Step handlers, step-recorder, and human-review stay in pipevals.
- [ ] 7.8 Update step handler imports — handlers that imported `dot-path` or types from the old walker paths now import from the package

## 8. Verification

- [ ] 8.1 Run existing walker unit tests against the package's core modules (graph-loader, topological-sort, branch-resolver, input-resolver, dot-path)
- [ ] 8.2 Run existing step handler unit tests — handlers stay in pipevals, just verify imports resolve
- [ ] 8.3 Verify pipevals `next build` succeeds with the package installed
- [ ] 8.4 Trigger a pipeline run end-to-end and verify identical behavior (step execution, status transitions, result recording)
- [ ] 8.5 Trigger a pipeline with a `human_review` node and verify suspension/resumption works through the hook adapter
