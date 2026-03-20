"use client";

import { useRef } from "react";
import { useOrgRoleStore } from "@/lib/stores/org-role";

export function RoleInit({ readOnly }: { readOnly: boolean }) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useOrgRoleStore.setState({ readOnly });
    initialized.current = true;
  }
  return null;
}
