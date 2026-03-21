import { Skeleton } from "@/components/ui/skeleton";

export default function DatasetsLoading() {
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
                <Skeleton className="h-4 w-36" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
