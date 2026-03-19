import type { Metadata } from "next";
import { requireSessionWithOrg } from "@/lib/api/auth";
import { getPipelinesForOrg, getTemplatesForOrg } from "@/lib/api/pipelines";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Pipelines",
};

export default async function PipelinesPage() {
  const { user, organizationId } = await requireSessionWithOrg();

  const [pipelines, templates] = await Promise.all([
    getPipelinesForOrg(organizationId),
    getTemplatesForOrg(organizationId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <PipelineList initialPipelines={pipelines} templates={templates} />
    </div>
  );
}
