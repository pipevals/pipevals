import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";
import { PipelineEditor } from "@/components/pipeline/pipeline-editor";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pipeline = await db.query.pipelines.findFirst({
    where: eq(pipelines.id, id),
    columns: { name: true },
  });
  return { title: pipeline?.name ?? "Pipeline" };
}

export default async function PipelineEditorPage({ params }: Props) {
  const { id } = await params;
  return <PipelineEditor pipelineId={id} />;
}
