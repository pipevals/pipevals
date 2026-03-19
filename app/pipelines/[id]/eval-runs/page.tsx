import { redirect } from "next/navigation";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { EvalRunList } from "@/components/pipeline/eval-run-list";
import { TriggerRunButton } from "@/components/pipeline/run-list-page-content";

export default async function EvalRunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await requirePipeline(id);
  if ("error" in result) redirect("/pipelines");

  const { pipeline, session } = result;
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineSubNav
        pipelineId={id}
        pipelineSlug={pipeline.slug}
        actions={
          <TriggerRunButton
            pipelineId={id}
            triggerSchema={pipeline.triggerSchema ?? {}}
          />
        }
      />
      <main className="px-8 py-10">
        <EvalRunList pipelineId={id} />
      </main>
    </div>
  );
}
