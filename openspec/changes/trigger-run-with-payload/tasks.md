## 1. Dialog Component

- [ ] 1.1 Create `components/pipeline/trigger-with-payload-dialog.tsx` with a shadcn/ui Dialog, a JSON textarea pre-filled with `{}`, and Cancel / Trigger buttons
- [ ] 1.2 Add client-side JSON validation: disable the submit button and show an inline error when the textarea content is not valid JSON
- [ ] 1.3 On submit, merge the parsed payload with `{ "source": "ui" }` and call `POST /api/pipelines/:id/runs` with the merged object as the request body
- [ ] 1.4 Close the dialog and call the `onSuccess` callback (to refresh the run list) after a successful API response

## 2. Run List Page Integration

- [ ] 2.1 Import and render `TriggerWithPayloadDialog` in `components/pipeline/run-list-page-content.tsx`
- [ ] 2.2 Add a "Trigger with payload…" secondary button next to the existing "Trigger" button
- [ ] 2.3 Wire the dialog's `onSuccess` to the same run-list refresh mechanism used by the existing trigger button

## 3. Tests

- [ ] 3.1 Unit test: dialog renders with `{}` pre-filled and submit button enabled
- [ ] 3.2 Unit test: invalid JSON disables submit button and shows error message
- [ ] 3.3 Unit test: valid JSON triggers the correct API call with merged payload
- [ ] 3.4 Unit test: dialog closes and `onSuccess` fires after successful API response
- [ ] 3.5 Unit test: Cancel button closes dialog without making an API call
