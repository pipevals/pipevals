import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderSkeleton } from "@/components/app-header-skeleton";

export default function RunsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderSkeleton />

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
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Runs list */}
      <main className="px-8 py-10">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
