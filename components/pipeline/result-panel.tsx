"use client";

import { DateTime, Duration } from "luxon";
import { useRunViewerStore } from "@/lib/stores/run-viewer";
import { StatusBadge } from "./nodes/status-badge";

function JsonBlock({ data }: { data: unknown }) {
  if (data == null) {
    return (
      <span className="text-[11px] italic text-muted-foreground">null</span>
    );
  }

  return (
    <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-[11px] leading-relaxed text-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

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

export function ResultPanel() {
  const selectedNodeId = useRunViewerStore((s) => s.selectedNodeId);
  const run = useRunViewerStore((s) => s.run);
  const nodes = useRunViewerStore((s) => s.nodes);

  if (!selectedNodeId || !run) {
    return (
      <aside className="flex w-80 shrink-0 items-center justify-center border-l border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">
          Click a node to inspect results
        </p>
      </aside>
    );
  }

  const node = nodes.find((n) => n.id === selectedNodeId);
  const stepResult = run.stepResults.find(
    (sr) => sr.nodeId === selectedNodeId,
  );

  if (!node) {
    return (
      <aside className="flex w-80 shrink-0 items-center justify-center border-l border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">Node not found</p>
      </aside>
    );
  }

  const status = stepResult?.status ?? "pending";

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="truncate text-sm font-medium text-foreground">
            {node.data.label || "Untitled"}
          </h2>
          <StatusBadge status={status} />
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {node.type}
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {stepResult?.durationMs != null && (
          <Section label="Duration">
            <p className="text-xs font-mono text-foreground">
              {formatDuration(stepResult.durationMs)}
            </p>
          </Section>
        )}

        <Section label="Timestamps">
          <div className="flex flex-col gap-0.5 text-xs text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span className="font-mono">
                {formatTimestamp(stepResult?.startedAt ?? null)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-mono">
                {formatTimestamp(stepResult?.completedAt ?? null)}
              </span>
            </div>
          </div>
        </Section>

        <Section label="Input">
          <JsonBlock data={stepResult?.input ?? null} />
        </Section>

        {status === "failed" && stepResult?.error != null && (
          <Section label="Error">
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
              <pre className="max-h-32 overflow-auto text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                {JSON.stringify(stepResult.error, null, 2)}
              </pre>
            </div>
          </Section>
        )}

        <Section label="Output">
          <JsonBlock data={stepResult?.output ?? null} />
        </Section>
      </div>
    </aside>
  );
}
