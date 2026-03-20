## 1. New Files

- [x] 1.1 Create `components/icons/workflow-icon.tsx` — staircase mark SVG (3 paths from WDK logo, viewBox `0 0 305 234`)
- [x] 1.2 Create `lib/workflow-url.ts` — `getWorkflowRunUrl(workflowRunId)` that returns the correct deep-link based on `NEXT_PUBLIC_WORKFLOW_INSPECT_URL` (local vs Vercel format detection)

## 2. Data Pipeline

- [x] 2.1 Add `workflowRunId: string | null` to `RunData` interface in `lib/stores/run-viewer.ts`

## 3. UI Integration

- [x] 3.1 Add the WDK icon-button to `components/pipeline/run-summary.tsx` — after stats, opens in new tab, tooltip "Inspect in Workflow DevKit", hidden when `workflowRunId` is null or URL is unset

## 4. Configuration

- [x] 4.1 Add `NEXT_PUBLIC_WORKFLOW_INSPECT_URL=http://localhost:3456` to `.env` and `.env.example`
- [x] 4.2 Add `"workflow:web": "npx workflow web"` script to `package.json`
