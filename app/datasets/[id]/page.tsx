import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { getDatasetWithItems } from "@/lib/api/datasets";
import { DatasetDetail } from "@/components/dataset/dataset-detail";
import { AppHeader } from "@/components/app-header";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

export const metadata: Metadata = {
  title: "Dataset",
};

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const dataset = await getDatasetWithItems(id);
  if (!dataset || dataset.organizationId !== organizationId) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <DatasetDetail dataset={dataset} />
    </div>
  );
}
