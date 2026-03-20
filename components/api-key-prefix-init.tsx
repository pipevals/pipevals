"use client";

import { useEffect } from "react";
import { useApiKeyStore } from "@/lib/stores/api-key";

export function ApiKeyPrefixInit() {
  const fetchKeyPrefix = useApiKeyStore((s) => s.fetchKeyPrefix);
  useEffect(() => {
    fetchKeyPrefix();
  }, [fetchKeyPrefix]);
  return null;
}
