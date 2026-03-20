import { create } from "zustand";
import { authClient } from "@/lib/auth-client";

interface ApiKeyState {
  keyPrefix: string | null;
  fetchKeyPrefix: () => Promise<void>;
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  keyPrefix: null,
  fetchKeyPrefix: async () => {
    const { data } = await authClient.apiKey.list();
    const first = data?.[0];
    set({ keyPrefix: first?.start ?? null });
  },
}));
