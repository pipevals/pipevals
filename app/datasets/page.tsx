import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { getDatasetsForOrg } from "@/lib/api/datasets";
import { DatasetList } from "@/components/dataset/dataset-list";
import { AppHeader } from "@/components/app-header";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

export const metadata: Metadata = {
  title: "Datasets",
};

export default async function DatasetsPage() {
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

  const datasets = await getDatasetsForOrg(organizationId);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <DatasetList initialDatasets={datasets} />
    </div>
  );
}
