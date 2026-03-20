"use client";

import { useEffect } from "react";
import { useOrgRoleStore } from "@/lib/stores/org-role";

export function RoleInit({ role }: { role: string }) {
  useEffect(() => {
    useOrgRoleStore.setState({ role });
  }, [role]);
  return null;
}
