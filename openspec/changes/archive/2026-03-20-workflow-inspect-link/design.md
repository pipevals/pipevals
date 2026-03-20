## Context

Pipeline runs execute via Vercel Workflow DevKit. The `pipelineRuns` table already stores `workflowRunId` (set after `start()` returns), and the single-run GET API already returns it in the response. However, the client-side `RunData` type omits it, so it never reaches the UI.

WDK ships a local web UI on port 3456 with deep-link support via query params (`?resource=run&id={runId}`). The Vercel dashboard has its own URL pattern (`/observability/workflows/runs/{runId}?environment=production`).

## Goals / Non-Goals

**Goals:**
- One-click navigation from run detail page to WDK observability for that run
- Support both local dev and Vercel production environments
- Graceful degradation when env var is unset or `workflowRunId` is null

**Non-Goals:**
- Embedding WDK UI inline (iframe or similar)
- Auto-starting the WDK web server as part of `npm run dev`
- Adding the link to the run list table (only the run detail RunSummary bar)

## Decisions

### Single env var with format detection

Use `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` as the sole configuration. The URL builder detects whether it points to Vercel (`vercel.com` in hostname) or local WDK, and constructs the deep-link accordingly.

**Why over separate mode flag:** One var is simpler. The URL itself carries enough information to determine the format. No need for `WORKFLOW_BACKEND=local|vercel` — that's redundant when the URL already tells you.

**URL formats:**
- Local: `${base}?resource=run&id=${workflowRunId}`
- Vercel: `${base}/runs/${workflowRunId}?environment=production`

### Staircase icon extracted from WDK logo

Use only the 3 staircase-mark paths from the Workflow SVG logo (not the full wordmark). Renders as a small icon button with tooltip.

**Why over generic external-link icon:** Recognizable brand mark communicates the destination. Sets precedent for third-party tool links in the UI.

### workflowRunId piped through existing data path

The API already returns `workflowRunId` via `...runData` spread. Only the `RunData` TypeScript interface needs updating — no API changes required.

## Risks / Trade-offs

- **Dead link when WDK web not running locally** → Acceptable. This is a power-user feature; the tooltip makes the destination clear.
- **Vercel URL requires manual env var setup** → Document in `.env.example`. The team/project path segments aren't available as auto-injected `NEXT_PUBLIC_*` vars on Vercel.
- **WDK URL format could change** → Low risk. Query param format is stable in current beta. URL builder is isolated in `lib/workflow-url.ts`, easy to update.
