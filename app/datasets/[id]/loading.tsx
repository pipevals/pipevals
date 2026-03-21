import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderSkeleton } from "@/components/app-header-skeleton";

export default function DatasetDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderSkeleton />

      {/* Dataset detail content */}
      <main className="flex flex-col gap-6 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
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
      </main>
    </div>
  );
}
