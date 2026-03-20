import { create } from "zustand";

interface OrgRoleState {
  readOnly: boolean;
  role: string;
  orgName: string;
}

export const useOrgRoleStore = create<OrgRoleState>(() => ({
  readOnly: false,
  role: "",
  orgName: "",
}));
