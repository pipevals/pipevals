import { Skeleton } from "@/components/ui/skeleton";

export default function MetricsLoading() {
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

      {/* Metrics dashboard skeleton */}
      <main className="flex-1 px-8 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="mt-2 h-24 w-full rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
