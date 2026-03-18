import { redirect } from "next/navigation";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { MetricsDashboard } from "@/components/pipeline/metrics-dashboard";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await requirePipeline(id);
  if ("error" in result) redirect("/pipelines");

  const { session } = result;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineSubNav pipelineId={id} />
      <main className="flex-1 px-8 py-10">
        <MetricsDashboard pipelineId={id} />
      </main>
    </div>
  );
}
