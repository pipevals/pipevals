import { redirect } from "next/navigation";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { TasksPageContent } from "@/components/pipeline/tasks-page-content";
import { RoleInit } from "@/components/role-init";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await requirePipeline(id);
  if ("error" in result) redirect("/pipelines");

  const { pipeline, session, role, orgName } = result;

  return (
    <div className="flex min-h-screen flex-col">
      <RoleInit role={role} orgName={orgName} />
      <AppHeader user={session.user} />
      <PipelineSubNav pipelineId={id} pipelineSlug={pipeline.slug} />
      <TasksPageContent pipelineId={id} />
    </div>
  );
}
