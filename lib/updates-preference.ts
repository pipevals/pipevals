const UPDATES_KEY = "pipevals:receive-updates";

export function storeUpdatesPreference(value: boolean) {
  try {
    localStorage.setItem(UPDATES_KEY, value ? "1" : "0");
  } catch {}
}

export function peekUpdatesPreference(): boolean | null {
  try {
    const v = localStorage.getItem(UPDATES_KEY);
    if (v === null) return null;
    return v === "1";
  } catch {
    return null;
  }
}

export function clearUpdatesPreference() {
  try {
    localStorage.removeItem(UPDATES_KEY);
  } catch {}
}
