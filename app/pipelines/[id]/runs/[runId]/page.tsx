import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { RunViewer } from "@/components/pipeline/run-viewer";

export const metadata: Metadata = {
  title: "Run Details",
};

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;

  const result = await requirePipeline(id);
  if ("error" in result) redirect("/pipelines");

  const { pipeline, session } = result;

  return (
    <div className="flex h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineSubNav pipelineId={id} pipelineSlug={pipeline.slug} />
      <RunViewer pipelineId={id} runId={runId} />
    </div>
  );
}
