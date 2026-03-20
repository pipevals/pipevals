"use client";

import { useRef } from "react";
import { useOrgRoleStore } from "@/lib/stores/org-role";

interface RoleInitProps {
  role: string;
  orgName: string;
}

export function RoleInit({ role, orgName }: RoleInitProps) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useOrgRoleStore.setState({ readOnly: role === "guest", role, orgName });
    initialized.current = true;
  }
  return null;
}
