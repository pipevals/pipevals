import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";
import { AppHeader } from "@/components/app-header";
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

  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineEditor pipelineId={id} />
    </div>
  );
}
