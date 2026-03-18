import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { RunListPageContent } from "@/components/pipeline/run-list-page-content";

export default async function RunListPage({
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
      <PipelineSubNav pipelineId={id} />
      <RunListPageContent
        pipelineId={id}
        pipelineSlug={pipeline.slug}
        triggerSchema={pipeline.triggerSchema ?? {}}
      />
    </div>
  );
}
