import { create } from "zustand";
import { authClient } from "@/lib/auth-client";

interface ApiKeyState {
  keyPrefix: string | null;
  fetchKeyPrefix: () => Promise<void>;
}

// Better Auth's list endpoint returns { apiKeys: ApiKey[] } at runtime,
// but the SDK client types don't reflect this wrapper. Extract safely.
function extractFirstPrefix(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const list = Array.isArray(obj.apiKeys) ? obj.apiKeys : Array.isArray(data) ? data : [];
  return (list[0] as { start?: string | null } | undefined)?.start ?? null;
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  keyPrefix: null,
  fetchKeyPrefix: async () => {
    try {
      const { data } = await authClient.apiKey.list();
      set({ keyPrefix: extractFirstPrefix(data) });
    } catch {
      // Silently ignore — keyPrefix stays null, curl commands won't include it
    }
  },
}));
