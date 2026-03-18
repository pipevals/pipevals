"use client";

import { useCallback, useRef, useState } from "react";
import { useRunViewerStore, type RunData } from "@/lib/stores/run-viewer";
import { extractMetrics } from "@/lib/pipeline/extract-metrics";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { StatusBadge } from "./nodes/status-badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, Copy01Icon } from "@hugeicons/core-free-icons";

function formatMetricValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  return String(value);
}

function MetricsPanel({ run }: { run: RunData }) {
  const metrics = extractMetrics(run);
  if (metrics.length === 0) return null;

  return (
    <div className="border-t border-border">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Metrics
        </h2>
      </div>
      <div className="flex flex-col gap-1 p-4">
        {metrics.map((m) => (
          <div
            key={m.name}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="shrink-0 text-muted-foreground">{m.name}</span>
            <span
              className="truncate font-mono font-medium tabular-nums text-foreground"
              title={String(m.value ?? "")}
            >
              {formatMetricValue(m.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TriggerPayloadPanel({ run }: { run: RunData | null }) {
  const payload = run?.triggerPayload;
  const payloadKeys = payload ? Object.keys(payload) : [];

  return (
    <div>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trigger
        </h2>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {!payload || payloadKeys.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {payload ? "Empty payload" : "No trigger payload recorded"}
          </p>
        ) : (
          <JsonBlock data={payload} />
        )}
      </div>
    </div>
  );
}

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
  copyValue,
  children,
}: {
  label: string;
  copyValue?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleCopy = useCallback(() => {
    if (copyValue == null) return;
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [copyValue]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {copyValue != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleCopy}
                aria-label={`Copy ${label}`}
              >
                {copied ? (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                ) : (
                  <HugeiconsIcon icon={Copy01Icon} size={12} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy {label}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

export function ResultPanel() {
  const selectedNodeId = useRunViewerStore((s) => s.selectedNodeId);
  const run = useRunViewerStore((s) => s.run);
  const nodes = useRunViewerStore((s) => s.nodes);

  if (!selectedNodeId || !run) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background overflow-y-auto">
        <TriggerPayloadPanel run={run} />
        {run && <MetricsPanel run={run} />}
        <p className="mt-auto border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          Click a node to inspect its inputs and outputs.
        </p>
      </aside>
    );
  }

  const node = nodes.find((n) => n.id === selectedNodeId);
  const stepResult = run.stepResults.find((sr) => sr.nodeId === selectedNodeId);

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
        <p className="mt-0.5 text-[11px] text-muted-foreground">{node.type}</p>
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

        <Section
          label="Input"
          copyValue={JSON.stringify(stepResult?.input ?? null, null, 2)}
        >
          <JsonBlock data={stepResult?.input ?? null} />
        </Section>

        {status === "failed" && stepResult?.error != null && (
          <Section
            label="Error"
            copyValue={JSON.stringify(stepResult.error, null, 2)}
          >
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
              <pre className="max-h-32 overflow-auto text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                {JSON.stringify(stepResult.error, null, 2)}
              </pre>
            </div>
          </Section>
        )}

        <Section
          label="Output"
          copyValue={JSON.stringify(stepResult?.output ?? null, null, 2)}
        >
          <JsonBlock data={stepResult?.output ?? null} />
        </Section>
      </div>
    </aside>
  );
}
