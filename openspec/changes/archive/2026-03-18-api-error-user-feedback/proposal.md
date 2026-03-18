## Why

API errors are currently swallowed silently or displayed inconsistently—some show inline text, others are fully ignored with `.catch(() => {})`. Users have no reliable feedback when operations like saving a pipeline, creating a pipeline, triggering a run, or deleting a pipeline fail.

## What Changes

- Install and configure `sonner` (the shadcn/ui-recommended toast library) as the app-wide notification system.
- Add a `<Toaster>` provider to the root layout so toasts are available everywhere.
- Create a small `handleApiError` utility that parses API error responses and fires a toast.
- Replace all silent `.catch(() => {})` and inconsistent inline error patterns with toast notifications for every API mutation (create, update, delete, trigger run).
- Keep existing inline error state where it provides contextual UI (e.g., save-error indicator in toolbar), but also show a toast so the user always gets a pop-up signal.

## Capabilities

### New Capabilities

- `api-error-toasts`: Toast-based feedback for every API mutation error, backed by sonner and a shared `handleApiError` helper.

### Modified Capabilities

## Impact

- `package.json`: Add `sonner` dependency.
- `app/layout.tsx`: Add `<Toaster>` component.
- `lib/`: New `handle-api-error.ts` utility.
- `components/pipeline/pipeline-list.tsx`: Replace inline-only error state with toasts for create/delete.
- `components/pipeline/run-list-page-content.tsx`: Show toast on trigger-run failure.
- `lib/stores/pipeline-builder.ts`: Show toast when save fails (in addition to existing `saveError` state).
- No API route changes needed.
