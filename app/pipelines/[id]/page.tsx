import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { PipelineSubNav } from "@/components/pipeline/pipeline-sub-nav";
import { PipelineToolbar } from "@/components/pipeline/toolbar";
import { PipelineEditor } from "@/components/pipeline/pipeline-editor";
import { RoleInit } from "@/components/role-init";

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

  const result = await requirePipeline(id, { withRole: true });
  if ("error" in result) redirect("/pipelines");

  const { pipeline, session, role } = result;
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <RoleInit role={role} />
      <AppHeader user={session.user} />
      <PipelineSubNav
        pipelineId={id}
        pipelineSlug={pipeline.slug}
        actions={<PipelineToolbar />}
      />
      <PipelineEditor pipelineId={id} />
    </div>
  );
}
