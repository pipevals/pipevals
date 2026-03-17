import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { RunListPageContent } from "@/components/pipeline/run-list-page-content";

export default async function RunListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <RunListPageContent pipelineId={id} />
    </div>
  );
}
