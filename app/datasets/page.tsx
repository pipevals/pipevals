import type { Metadata } from "next";
import { requireSessionWithOrg } from "@/lib/api/auth";
import { getDatasetsForOrg } from "@/lib/api/datasets";
import { DatasetList } from "@/components/dataset/dataset-list";
import { AppHeader } from "@/components/app-header";
import { RoleInit } from "@/components/role-init";

export const metadata: Metadata = {
  title: "Datasets",
};

export default async function DatasetsPage() {
  const { user, organizationId, role } = await requireSessionWithOrg();

  const { data: datasets } = await getDatasetsForOrg(organizationId, { limit: 200, offset: 0 });

  return (
    <div className="flex min-h-screen flex-col">
      <RoleInit role={role} />
      <AppHeader user={user} />
      <DatasetList initialDatasets={datasets} />
    </div>
  );
}
