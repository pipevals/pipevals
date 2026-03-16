## 1. Auth Hardening

- [x] 1.1 Add runtime validation in `lib/auth.ts` that throws if `BETTER_AUTH_SECRET` is unset or shorter than 32 characters
- [x] 1.2 Configure `rateLimit` in `lib/auth.ts` with `{ enabled: true, window: 60, max: 10, storage: "memory" }`
- [x] 1.3 Configure `organization()` plugin with `{ organizationLimit: 5, membershipLimit: 100 }`
- [x] 1.4 Switch plugin imports in `lib/auth.ts` from `better-auth/plugins` barrel to dedicated paths (`better-auth/plugins/organization`, `better-auth/plugins/admin`, `better-auth/plugins/bearer`)
- [x] 1.5 Update `.env.example` to document `BETTER_AUTH_SECRET` minimum length and generation command

## 2. Bundle Optimization

- [x] 2.1 In `components/pipeline/pipeline-editor.tsx`, dynamically import `PipelineCanvas` with `next/dynamic` and `ssr: false`, provide a skeleton fallback
- [x] 2.2 In `components/pipeline/run-viewer.tsx`, dynamically import `RunViewerCanvas` with `next/dynamic` and `ssr: false`, provide a skeleton fallback

## 3. Performance

- [ ] 3.1 In `app/api/pipelines/[id]/route.ts` PUT handler, wrap the `nodeConflicts` and `edgeConflicts` queries in `Promise.all`
- [ ] 3.2 In `components/pipeline/nodes/index.tsx`, memoize the `outputs` array in `ConditionNode` using `useMemo`

## 4. Server-Side Data Fetching

- [ ] 4.1 Create a shared query function in `lib/api/pipelines.ts` that fetches pipelines for an organization (reusable by both the server page and the API route)
- [ ] 4.2 Refactor `app/pipelines/page.tsx` to be an async server component that fetches pipelines and passes them as props to `PipelineList`
- [ ] 4.3 Update `PipelineList` to accept an `initialPipelines` prop and use it for initial render, removing the `useEffect` fetch-on-mount

## 5. Error & Loading UX

- [ ] 5.1 Create `app/error.tsx` — client component with error message and retry button, styled with Tailwind
- [ ] 5.2 Create `app/not-found.tsx` — styled 404 page with link to home
- [ ] 5.3 Create `app/pipelines/loading.tsx` — skeleton placeholder for the pipeline list page
- [ ] 5.4 Create `app/pipelines/[id]/loading.tsx` — skeleton placeholder for the pipeline editor page

## 6. Metadata

- [ ] 6.1 Update root `app/layout.tsx` metadata to `{ title: { default: "Pipevals", template: "%s - Pipevals" }, description: "..." }`
- [ ] 6.2 Add static metadata to `app/pipelines/page.tsx` with title "Pipelines"
- [ ] 6.3 Add `generateMetadata` to `app/pipelines/[id]/page.tsx` that fetches the pipeline name and returns it as the title
- [ ] 6.4 Add static metadata to `app/pipelines/[id]/runs/[runId]/page.tsx` with title "Run Details"
