import { DateTime, Duration } from "luxon";

export function formatDuration(ms: number): string {
  const dur = Duration.fromMillis(ms);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return dur.toFormat("s.SSS's'");
  return dur.toFormat("m'm' s's'");
}

export function formatTimestamp(ts: string | null): string {
  if (!ts) return "—";
  const dt = DateTime.fromISO(ts);
  if (!dt.isValid) return "—";
  return dt.toFormat("HH:mm:ss.SSS");
}

export function formatDateTime(ts: string | null): string {
  if (!ts) return "—";
  const dt = DateTime.fromISO(ts);
  if (!dt.isValid) return "—";
  return dt.toFormat("MMM d, HH:mm");
}

export function computeDuration(
  startedAt: string | null,
  completedAt: string | null,
  isLive: boolean,
): string {
  if (!startedAt) return "—";
  const start = DateTime.fromISO(startedAt);
  if (!start.isValid) return "—";
  const end = completedAt
    ? DateTime.fromISO(completedAt)
    : isLive
      ? DateTime.now()
      : start;
  return formatDuration(end.diff(start).toMillis());
}
