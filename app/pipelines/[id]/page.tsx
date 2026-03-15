import { PipelineEditor } from "@/components/pipeline/pipeline-editor";

export default async function PipelineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PipelineEditor pipelineId={id} />;
}
