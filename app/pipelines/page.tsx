import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPipelinesForOrg } from "@/lib/api/pipelines";
import { PipelineList } from "@/components/pipeline/pipeline-list";

export const metadata: Metadata = {
  title: "Pipelines",
};

export default async function PipelinesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/sign-in");

  const pipelines = await getPipelinesForOrg(organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pipelines</h1>
          <p className="text-xs text-muted-foreground">
            Build and manage evaluation pipelines
          </p>
        </div>
      </div>
      <PipelineList initialPipelines={pipelines} />
    </div>
  );
}
