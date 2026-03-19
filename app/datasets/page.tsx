import type { Metadata } from "next";
import { requireSessionWithOrg } from "@/lib/api/auth";
import { getDatasetsForOrg } from "@/lib/api/datasets";
import { DatasetList } from "@/components/dataset/dataset-list";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Datasets",
};

export default async function DatasetsPage() {
  const { user, organizationId } = await requireSessionWithOrg();

  const datasets = await getDatasetsForOrg(organizationId);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <DatasetList initialDatasets={datasets} />
    </div>
  );
}
