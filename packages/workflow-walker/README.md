# @pipevals/workflow-walker

A durable DAG execution engine powered by [Vercel Workflow](https://vercel.com/docs/workflow). Walks a directed acyclic graph of steps with topological ordering, conditional branching, parallel execution, and optional hook-based suspension (e.g. human review).

## Status

Currently consumed as a local `file:` dependency by pipevals. Not yet published to npm.

## Before Publishing to npm

### 1. Switch exports from source to compiled output

The package currently points exports at `./src/index.ts` (works for local `file:` deps where the consumer's bundler compiles it). For npm, switch to compiled output:

```jsonc
// package.json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
    },
  },
}
```

Run `bun run build` before publishing. The `dist/` directory is gitignored — `npm pack` / `npm publish` will include it via the `files` field.

### 2. Un-gitignore dist for the package (or use prepublish)

Either:

- Add a `prepublishOnly` script: `"prepublishOnly": "bun run build"`
- Or remove `packages/*/dist` from the root `.gitignore` and commit built output

### 3. Move to its own repo (optional)

The design doc recommends a standalone repo for cross-project consumption. When ready:

- Copy `packages/workflow-walker/` to a new repo
- Publish to npm (or a private registry)
- Replace `"file:./packages/workflow-walker"` in pipevals with the published version

## Architecture

```
Consumer (pipevals)                    Package (@pipevals/workflow-walker)
─────────────────────                  ────────────────────────────────────

workflow.ts                            walker.ts
  "use workflow"                         createWalker({ persistence, steps, hooks })
  └─ orchestrate(runId)                  └─ returns orchestrate() function
                                            ├─ persistence.loadRunData()
persistence-adapter.ts                     ├─ topologicalSort → level-by-level
  "use step" on each method                ├─ for each node:
  └─ Drizzle queries                       │   ├─ hooks?.shouldSuspend → executeSuspendable
                                           │   └─ executeNode → handler()
walker-registry.ts                         ├─ persistence.updateRunStatus()
  step handlers with "use step"            └─ return results
  └─ ai_sdk, sandbox, condition, ...
                                         core/
hook-adapter.ts                            graph-loader.ts, topological-sort.ts,
  "use step" on DB operations              branch-resolver.ts, input-resolver.ts,
  shouldSuspend → human_review             dot-path.ts
  executeSuspendable → 3-phase hooks
```

## Key Constraints (discovered during extraction)

### `"use workflow"` must be in the consumer's source

The Vercel Workflow SWC plugin only sets `workflowId` on statically exported functions. Functions returned from a factory (like `createWalker`) don't get the property — `start()` throws. The consumer writes a thin wrapper:

```ts
const orchestrate = createWalker({ persistence, steps, hooks });

export async function runPipeline(runId: string) {
  "use workflow";
  return orchestrate(runId);
}
```

### `"use step"` must be on consumer-provided functions

The workflow builder separates code into workflow and step bundles. Node.js-only modules (database drivers, `@vercel/sandbox`, etc.) must be behind a `"use step"` boundary or the build fails. The package itself has no `"use step"` — all step boundaries are on the consumer's adapters and handlers.

## Consumer Integration Checklist

1. Install the package
2. Implement `PersistenceAdapter` — each method must carry `"use step"`
3. Build a `StepRegistry` — each handler must carry `"use step"`
4. Optionally implement `HookAdapter` for suspendable steps (e.g. human review)
5. Call `createWalker({ persistence, steps, hooks })` to get the orchestration function
6. Wrap it in an exported `"use workflow"` function
7. Call `start(yourWorkflow, [runId])` from an API route
