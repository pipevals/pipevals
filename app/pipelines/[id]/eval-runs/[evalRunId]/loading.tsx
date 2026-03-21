import { Skeleton } from "@/components/ui/skeleton";

export default function EvalRunLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* AppHeader skeleton */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-[18px] w-[18px] rounded" />
          <nav className="flex items-center gap-5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </nav>
        </div>
        <Skeleton className="h-7 w-7 rounded-full" />
      </header>

      {/* PipelineSubNav skeleton */}
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <span className="h-4 w-px bg-border" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Eval run detail skeleton */}
      <main className="px-8 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <div className="flex gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-20" />
                ))}
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-6 border-b border-border px-4 py-3 last:border-b-0"
              >
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-20" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
