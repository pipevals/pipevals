import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, or, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { pipelineTemplates } from "@/lib/db/pipeline-schema";
import { getPipelinesForOrg } from "@/lib/api/pipelines";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import { AppHeader } from "@/components/app-header";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

export const metadata: Metadata = {
  title: "Pipelines",
};

export default async function PipelinesPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  let organizationId = session.session.activeOrganizationId;
  if (!organizationId && isAutoInviteEnabled()) {
    const membership = await db.query.member.findFirst({
      where: eq(member.userId, session.user.id),
    });
    if (!membership) redirect("/sign-in");

    organizationId = membership.organizationId;
    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId },
    });
  }

  if (!organizationId) redirect("/sign-in");

  const [pipelines, templates] = await Promise.all([
    getPipelinesForOrg(organizationId),
    db
      .select({
        id: pipelineTemplates.id,
        name: pipelineTemplates.name,
        slug: pipelineTemplates.slug,
        description: pipelineTemplates.description,
        organizationId: pipelineTemplates.organizationId,
      })
      .from(pipelineTemplates)
      .where(
        or(
          isNull(pipelineTemplates.organizationId),
          eq(pipelineTemplates.organizationId, organizationId),
        ),
      ),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <PipelineList initialPipelines={pipelines} templates={templates} />
    </div>
  );
}
