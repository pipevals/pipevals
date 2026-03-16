import { RunList } from "@/components/pipeline/run-list";

export default async function RunListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <RunList pipelineId={id} />
    </div>
  );
}
