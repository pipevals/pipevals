import type { Metadata } from "next";
import { requireSessionWithOrg } from "@/lib/api/auth";
import { AppHeader } from "@/components/app-header";
import { RoleInit } from "@/components/role-init";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireSessionWithOrg();

  return (
    <div className="flex min-h-screen flex-col">
      <RoleInit role={role} />
      <AppHeader user={user} />
      <div className="flex flex-1">
        <SettingsSidebar />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
