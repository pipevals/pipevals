import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderSkeleton } from "@/components/app-header-skeleton";

export default function PipelinesLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderSkeleton />

      {/* Search bar */}
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* List items */}
      <main className="flex flex-col gap-6 px-8 py-6">
        <div className="flex flex-col border-t border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center border-b border-border py-4 -mx-2 px-2"
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
