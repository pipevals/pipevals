export default function PipelineEditorLoading() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-12 items-center border-b border-border px-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-56 shrink-0 border-r border-border bg-muted/20" />
        <div className="flex min-w-0 flex-1 items-center justify-center bg-muted/30">
          <p className="text-xs text-muted-foreground">Loading canvas…</p>
        </div>
        <div className="w-72 shrink-0 border-l border-border bg-muted/20" />
      </div>
    </div>
  );
}
