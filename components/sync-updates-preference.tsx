"use client";

import { useEffect } from "react";
import {
  peekUpdatesPreference,
  clearUpdatesPreference,
} from "@/lib/updates-preference";

export function SyncUpdatesPreference() {
  useEffect(() => {
    const pref = peekUpdatesPreference();
    if (pref === null) return;
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiveUpdates: pref }),
    }).then((r) => r.ok && clearUpdatesPreference());
  }, []);
  return null;
}
