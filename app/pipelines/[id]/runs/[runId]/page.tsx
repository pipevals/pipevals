import { RunViewer } from "@/components/pipeline/run-viewer";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  return <RunViewer pipelineId={id} runId={runId} />;
}
