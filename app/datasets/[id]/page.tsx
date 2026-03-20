import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSessionWithOrg } from "@/lib/api/auth";
import { getDatasetWithItems } from "@/lib/api/datasets";
import { DatasetDetail } from "@/components/dataset/dataset-detail";
import { AppHeader } from "@/components/app-header";
import { RoleInit } from "@/components/role-init";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dataset = await getDatasetWithItems(id);
  return { title: dataset?.name ?? "Dataset" };
}

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, organizationId, role } = await requireSessionWithOrg();

  const dataset = await getDatasetWithItems(id);
  if (!dataset || dataset.organizationId !== organizationId) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <RoleInit role={role} />
      <AppHeader user={user} />
      <DatasetDetail dataset={dataset} />
    </div>
  );
}
