## Context

API mutations (create pipeline, delete pipeline, save pipeline, trigger run) use bare `fetch()` calls scattered across components and the Zustand store. Error handling is inconsistent: some errors update local state for inline display, some are silently swallowed with `.catch(() => {})`, and none produce a pop-up notification. Users can complete an action (e.g., click "Save") and receive zero feedback when it fails.

The app already uses shadcn/ui; `sonner` is the toast library recommended by shadcn/ui and integrates with zero config beyond a `<Toaster>` in the root layout.

## Goals / Non-Goals

**Goals:**
- Every API mutation error produces a visible toast notification.
- A shared `handleApiError` helper centralises error parsing so call sites stay clean.
- The `<Toaster>` is added once to the root layout and available everywhere.
- Existing inline error state (e.g., `saveError` in the pipeline-builder store, `triggerError` in run-list) is preserved where it drives contextual UI.

**Non-Goals:**
- Success toasts — only failures are in scope for this change.
- Retry logic or error recovery flows.
- GET/read errors (SWR already exposes `error` state; inline UI exists for those).
- Centralising all fetch calls behind an API client abstraction (out of scope).

## Decisions

### D1 — Use `sonner` for toasts

`sonner` is the shadcn/ui default toast library. It is already used by most shadcn/ui projects and requires only two additions: `bun add sonner` and a single `<Toaster>` in the layout. Alternatives:
- **shadcn/ui `toast` (radix-based)**: Requires a `useToast` hook + `<Toaster>` + manual `toast()` call-sites. More boilerplate with no benefit for this use case.
- **react-hot-toast**: Functionally similar to sonner but not the shadcn/ui recommendation.

### D2 — Shared `handleApiError` utility

A single `lib/handle-api-error.ts` function accepts a `Response | unknown` and:
1. If the value is a `Response`, attempts to parse `response.json().error` for a server-supplied message.
2. Falls back to a generic "Something went wrong" message.
3. Calls `toast.error(message)`.

This keeps call sites to a one-liner: `handleApiError(e)` in a catch block. Alternatives:
- **Inline `toast.error()` at every call site**: Works but duplicates parsing logic and is harder to update globally.
- **Centralised API client**: Correct long-term direction but overkill for this change.

### D3 — Keep existing inline error state

`saveError` (toolbar) and `triggerError` (run-list) provide contextual, persistent error indicators that a transient toast cannot replace. Both stay in place; the toast is additive.

## Risks / Trade-offs

- **Double-error UI**: If both a toast and inline error text appear simultaneously, users see redundant feedback. Mitigation: inline error state should remain as-is (it's dismissible/transient by nature); the toast provides the immediate pop-up signal.
- **Toast fatigue**: Excessive toasts for non-critical errors degrade UX. Mitigation: scope this change strictly to mutation failures, not GET/read errors.
- **`sonner` version churn**: `sonner` is actively maintained; API changes are rare but possible. Mitigation: pin to a minor version range.
