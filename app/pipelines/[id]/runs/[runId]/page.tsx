import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  return (
    <div className="flex h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineSubNav pipelineId={id} />
      <RunViewer pipelineId={id} runId={runId} />
    </div>
  );
}
