## Why

Pipeline runs are powered by Vercel Workflow DevKit under the hood, but there's no way to jump from our run detail UI into WDK's observability tools. Developers debugging a stuck or failed run must manually look up the `workflowRunId` and run CLI commands. A direct link from the RunSummary bar saves that context switch.

## What Changes

- Add a WDK staircase icon-button in the RunSummary bar that links to the workflow run's inspect page
- Support both local WDK web UI (`localhost:3456`) and Vercel dashboard deep-links via a single `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` env var
- Surface `workflowRunId` through the existing data pipeline (already in API response, just needs adding to the client-side `RunData` type)
- Add a `workflow:web` npm script for convenience

## Capabilities

### New Capabilities

- `workflow-inspect-link`: Icon-button in RunSummary that opens the WDK observability UI for the current run. Handles local vs Vercel URL formats, hidden when `workflowRunId` is null or env var is unset.

### Modified Capabilities

_(none)_

## Impact

- **UI**: `RunSummary` component gains a new icon-button (end of bar, after stats)
- **Store**: `RunData` interface adds `workflowRunId: string | null`
- **Env**: New `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` in `.env` and `.env.example`
- **Scripts**: New `workflow:web` script in `package.json`
- **New files**: `components/icons/workflow-icon.tsx`, `lib/workflow-url.ts`
