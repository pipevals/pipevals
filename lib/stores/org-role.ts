import { create } from "zustand";

interface OrgRoleState {
  readOnly: boolean;
}

export const useOrgRoleStore = create<OrgRoleState>(() => ({
  readOnly: false,
}));
