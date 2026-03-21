## Context

The pipevals walker (`lib/pipeline/walker/`) is a ~500-line DAG execution engine built on Vercel Workflow. It has clean internal layering:

- **Layer 0 (pure):** graph-loader, topological-sort, branch-resolver, input-resolver, dot-path — zero external dependencies
- **Layer 1 (orchestration):** `workflow.ts` — the 82-line main loop using `"use workflow"` / `"use step"` directives
- **Layer 2 (persistence):** steps.ts, step-recorder.ts, human-review.ts — coupled to Drizzle and pipevals DB schema
- **Layer 3 (handlers):** step registry with 7 handler types — domain-flavored but structurally generic

The goal is to extract Layers 0+1 (and optionally Layer 3 handlers) into a publishable npm package, with Layer 2 replaced by adapter interfaces the consumer implements.

Consumers are Vercel-deployed Next.js apps in separate repos that already use `withWorkflow()` in their Next.js config.

### SWC Plugin Verification

Investigation of `@workflow/next`, `@workflow/builders`, and `@workflow/swc-plugin` confirmed that:
- The webpack loader applies to **all** `.ts`/`.js` files with no `include`/`exclude` — files from `node_modules` are processed
- Turbopack uses **content-based matching** for `"use workflow"` / `"use step"` patterns, regardless of file location
- `shouldTransformFile()` in `@workflow/builders` only excludes `@workflow/*` SDK packages, not user packages
- Conclusion: `"use workflow"` / `"use step"` directives in an npm package **will** be compiled correctly by the consuming app

## Goals / Non-Goals

**Goals:**
- Publish a package that gives any Vercel Workflow project a durable, replayable DAG execution engine
- Clean adapter boundary: consumer owns persistence, step handlers, and hook-based suspension logic
- Ship the existing step handlers (ai_sdk, api_request, sandbox, condition, transform, metric_capture) as opt-in exports
- Generalize the human_review suspension pattern into a `HookAdapter` interface any suspendable step type can use
- Pipevals consumes the extracted package with zero behavioral regressions

**Non-Goals:**
- Supporting non-Vercel-Workflow runtimes (no generic async engine — Vercel Workflow IS the execution engine)
- Supporting non-Next.js frameworks (the SWC plugin integration is Next.js-specific via `withWorkflow()`)
- Extracting the pipeline builder UI, graph model, or any frontend code
- Building a CLI or standalone runner — this is a library consumed by API routes

## Decisions

### 1. Factory + consumer wrapper pattern for adapter injection

**Spike finding:** The SWC plugin only transforms `"use workflow"` on statically exported functions — not on functions returned from factories. It cannot add the required `workflowId` property to dynamically created functions. However, `"use step"` functions in packages ARE transformed, including closure capture via `__private_getClosureVars()`.

The package exports a `createWalker()` factory that returns an orchestration function **without** `"use workflow"`. The consumer wraps it with a 3-line function that carries `"use workflow"`:

```typescript
// In the package (no "use workflow"):
import { createWalker } from "@pipevals/workflow-walker";

const orchestrate = createWalker({
  persistence: myDrizzleAdapter,
  steps: myStepRegistry,
  hooks: myHookAdapter,    // optional
});

// In the consumer's source (has "use workflow"):
export async function runPipeline(runId: string) {
  "use workflow";
  return orchestrate(runId);
}

// In API route:
await start(runPipeline, [runId]);
```

**Why this split:** The SWC plugin needs `"use workflow"` on a statically analyzable exported function to set `workflowId` (required by `start()`). Steps don't have this constraint — `"use step"` functions in packages are transformed and registered globally with namespaced IDs like `step//package-name@version//factoryName/stepName`.

**Why over class-based:** The walker is a single function, not an object with methods. Classes would add unnecessary ceremony.

**Why over dependency injection container:** The walker has exactly 3 dependencies. A DI container is overkill. Named parameters on a factory are clear and type-safe.

**Alternative considered — re-export pattern:** Have the package export the pure core and a template the consumer copies into their source tree. Rejected because it defeats the purpose of a package (no shared upgrades, consumer must manually sync changes).

### 2. Adapter interfaces over abstract classes

```typescript
interface PersistenceAdapter {
  loadRunData(runId: string): Promise<{ graphSnapshot: GraphSnapshot; triggerPayload: Record<string, unknown> }>;
  updateRunStatus(runId: string, status: "running" | "completed" | "failed"): Promise<void>;
  recordStepRunning(runId: string, nodeId: string): Promise<void>;
  recordStepCompleted(runId: string, nodeId: string, input: unknown, output: unknown, durationMs: number): Promise<void>;
  recordStepFailed(runId: string, nodeId: string, input: unknown, error: unknown, durationMs: number): Promise<void>;
}

interface HookAdapter {
  shouldSuspend(node: WalkerNode): boolean;
  executeSuspendable(runId: string, node: WalkerNode, input: StepInput): Promise<Record<string, unknown>>;
}

type StepRegistry = Record<string, { handler: StepHandler }>;
```

**Why interfaces over abstract classes:** No shared implementation to inherit. Each consumer's persistence is fundamentally different (Drizzle vs Prisma vs raw SQL vs in-memory). Interfaces enforce the contract without imposing structure.

**Why `HookAdapter.shouldSuspend()` over hardcoded type check:** The current walker hardcodes `node.type === "human_review"`. With a `shouldSuspend()` predicate, consumers can make any step type suspendable (approval gates, external webhook waits, manual data entry) without modifying the walker.

### 3. Step handlers stay in the consumer

Step handlers (ai_sdk, api_request, sandbox, condition, transform, metric_capture) remain in pipevals. The package only exports the `StepHandler` type and the `StepRegistry` type. Consumers build their own registry and pass it to `createWalker()`.

**Why not ship handlers in the package:** Handlers carry domain-specific concerns (AI Gateway routing, sandbox config, metric semantics) and heavy peer deps (`ai`, `@vercel/sandbox`). Shipping them would force every consumer to install deps they don't need, and would couple the package's release cadence to handler changes. The package owns the engine; the consumer owns the vocabulary.

**Alternative considered — handlers as opt-in sub-paths:** Export each handler from `/steps/ai-sdk`, `/steps/sandbox`, etc. with optional peer deps. Rejected because it still bloats the package with pipevals-flavored code, and the handlers are trivially small (each is 20-60 lines). Consumers can copy the pattern or import from a future recipes repo.

### 4. Generic string keys for step types (not enum)

The current `StepType` is sourced from a Drizzle DB enum. The package uses `string` keys in the registry:

```typescript
type StepRegistry = Record<string, { handler: StepHandler }>;
```

**Why:** The package cannot depend on any specific DB schema. Consumers define their own step types. TypeScript generics can narrow this at the call site if the consumer wants type safety over their known set.

### 5. Package structure as a standalone repo (not monorepo workspace)

The package lives in its own repo, published to npm. Pipevals installs it as a regular dependency.

**Why over monorepo workspace:** Other consumer projects are in separate repos. A monorepo would require all consumers to live together. npm is the natural distribution channel.

**Why over git submodule:** Submodules add operational complexity (pinned commits, sync issues). A versioned npm package has clear upgrade semantics.

### 6. Spike-first approach for `"use step"` closure capture

Before full extraction, a minimal spike verifies that the factory pattern works with the SWC plugin. The spike:
1. Creates a minimal package with `createWalker()` that returns a `"use workflow"` function
2. The workflow function contains `"use step"` functions that call adapter methods via closure
3. A test app installs the package, starts a workflow, and verifies step execution + replay

**Why spike first:** The SWC plugin's handling of closures in `"use step"` functions is undocumented. If closure capture fails, the entire factory pattern is invalid and we'd need a different approach (e.g., passing adapters as step arguments, or code generation). The spike costs hours; discovering this mid-extraction costs days.

## Risks / Trade-offs

**[~~Closure capture in `"use step"` may fail~~]** → RESOLVED by spike. The SWC plugin extracts closure variables via `__private_getClosureVars()` and makes them available to the step function at replay time. Confirmed in compiled output.

**[`"use workflow"` cannot be in the package]** → RESOLVED by revised pattern. The SWC plugin only transforms `"use workflow"` on statically exported functions. The consumer writes a 3-line wrapper in their own source tree. This is minimal boilerplate and gives the consumer explicit control over the workflow entry point.

**[Vercel Workflow version coupling]** → The package peer-depends on a specific `workflow` version range. Breaking changes in the Workflow SDK could break the walker.
→ *Mitigation:* Use a permissive peer dep range (`^4.x`). The walker's surface area on the Workflow API is small (`"use workflow"`, `"use step"`, `defineHook`, `start`).

**[Two-repo maintenance]** → Changes that span the walker package and pipevals require coordinated releases.
→ *Mitigation:* The adapter boundary is the contract. Internal walker changes don't require pipevals changes. Adapter interface changes are versioned with semver.

**[Discovery limitation]** → Vercel Workflow's initial entry point discovery scans only `app/` and `pages/` directories. The walker function in `node_modules` won't be discovered directly.
→ *Mitigation:* This is a non-issue — the consumer's API route calls `start(runPipeline, [runId])`, which is in `app/api/...`. The loader then follows imports into the package. This is the natural pattern already.

## Open Questions

1. **Package name:** `@pipevals/workflow-walker`? `workflow-dag-walker`? Something more generic since it's not pipevals-specific?
2. **Should the `dot-path` module be its own package?** It's useful independently of the walker (config resolution, template interpolation). Could be `@pipevals/dot-path` or similar.
3. **Fallback strategy if spike fails:** If closure capture doesn't work, do we prefer (a) passing adapters as step function arguments, (b) module-level `configure()` call, or (c) exporting only the pure core and a copy-paste template for the orchestration loop?
