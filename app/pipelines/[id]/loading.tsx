import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderSkeleton } from "@/components/app-header-skeleton";

export default function PipelineEditorLoading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
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
        </div>
      </div>

      {/* Editor 3-panel layout */}
      <div className="flex min-h-0 flex-1">
        <div className="w-56 shrink-0 border-r border-border bg-background" />
        <div className="min-w-0 flex-1 bg-muted/30" />
        <div className="w-72 shrink-0 border-l border-border bg-background" />
      </div>
    </div>
  );
}
