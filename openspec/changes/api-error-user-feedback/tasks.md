## 1. Install and Configure Sonner

- [x] 1.1 Add `sonner` package via `bun add sonner`
- [x] 1.2 Add `<Toaster>` component to `app/layout.tsx`

## 2. Create `handleApiError` Utility

- [x] 2.1 Create `lib/handle-api-error.ts` that accepts `Response | unknown`, parses `response.json().error` when available, and calls `toast.error()` with the message or a generic fallback

## 3. Surface Errors in Pipeline List

- [x] 3.1 In `components/pipeline/pipeline-list.tsx`, call `handleApiError` in the create-pipeline catch block
- [x] 3.2 In `components/pipeline/pipeline-list.tsx`, call `handleApiError` in the delete-pipeline catch block

## 4. Surface Errors in Pipeline Save

- [x] 4.1 In `lib/stores/pipeline-builder.ts`, call `handleApiError` in the save catch block (keep existing `saveError` state update)

## 5. Surface Errors in Run Trigger

- [x] 5.1 In `components/pipeline/run-list-page-content.tsx`, call `handleApiError` when the trigger-run mutation throws or returns a non-OK response (keep existing `triggerError` state update)
