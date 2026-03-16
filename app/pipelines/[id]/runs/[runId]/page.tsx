import type { Metadata } from "next";
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
  return <RunViewer pipelineId={id} runId={runId} />;
}
