import { PipelineList } from "@/components/pipeline/pipeline-list";

export default function PipelinesPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pipelines</h1>
          <p className="text-xs text-muted-foreground">
            Build and manage evaluation pipelines
          </p>
        </div>
      </div>
      <PipelineList />
    </div>
  );
}
