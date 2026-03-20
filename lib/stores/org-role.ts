import { create } from "zustand";

interface OrgRoleState {
  role: string;
}

export const useOrgRoleStore = create<OrgRoleState>(() => ({
  role: "",
}));

const READ_ONLY_ROLES = new Set(["guest"]);

export function selectReadOnly(s: OrgRoleState) {
  return READ_ONLY_ROLES.has(s.role);
}
