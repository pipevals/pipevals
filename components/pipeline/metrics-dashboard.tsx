"use client";

import useSWR from "swr";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartLineData02Icon } from "@hugeicons/core-free-icons";
import { MetricTrendsChart } from "./charts/metric-trends-chart";
import { ScoreDistributionChart } from "./charts/score-distribution-chart";

export interface MetricRunEntry {
  id: string;
  status: string;
  createdAt: string;
  durationMs: number | null;
  metrics: Record<string, unknown>;
  steps: { label: string; durationMs: number | null }[];
}

interface MetricsResponse {
  runs: MetricRunEntry[];
}

export interface MetricsAggregate {
  totalRuns: number;
  passRate: number;
  avgDurationMs: number | null;
  avgPrimaryMetric: { name: string; value: number } | null;
  metricNames: string[];
  runs: MetricRunEntry[];
}

function computeAggregates(data: MetricsResponse): MetricsAggregate {
  const { runs } = data;
  const totalRuns = runs.length;

  const completedRuns = runs.filter((r) => r.status === "completed");
  const passRate = totalRuns > 0 ? completedRuns.length / totalRuns : 0;

  const durations = runs
    .map((r) => r.durationMs)
    .filter((d): d is number => d != null);
  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

  // Collect all distinct metric names across runs
  const metricNameSet = new Set<string>();
  for (const run of runs) {
    for (const key of Object.keys(run.metrics)) {
      metricNameSet.add(key);
    }
  }
  const metricNames = Array.from(metricNameSet).sort();

  // Find first numeric metric for the stat card
  let avgPrimaryMetric: { name: string; value: number } | null = null;
  for (const name of metricNames) {
    const values = runs
      .map((r) => r.metrics[name])
      .filter((v): v is number => typeof v === "number");
    if (values.length > 0) {
      avgPrimaryMetric = {
        name,
        value: values.reduce((a, b) => a + b, 0) / values.length,
      };
      break;
    }
  }

  return {
    totalRuns,
    passRate,
    avgDurationMs,
    avgPrimaryMetric,
    metricNames,
    runs,
  };
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load metrics");
    return res.json() as Promise<MetricsResponse>;
  });

export function MetricsDashboard({ pipelineId }: { pipelineId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/pipelines/${pipelineId}/runs/metrics`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-xs text-muted-foreground">Loading metrics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load metrics"}
        </p>
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={ChartLineData02Icon} size={24} aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No metrics yet</EmptyTitle>
          <EmptyDescription>
            Run this pipeline to start collecting metrics
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const agg = computeAggregates(data);

  return (
    <div className="flex flex-col gap-8">
      <MetricsStatCards agg={agg} />
      {agg.metricNames.length > 0 && (
        <MetricTrendsChart runs={agg.runs} metricNames={agg.metricNames} />
      )}
      <div className="grid grid-cols-2 gap-8">
        <ScoreDistributionChart runs={agg.runs} metricNames={agg.metricNames} />
        <StepDurationPlaceholder />
      </div>
      <RecentRunsPlaceholder />
    </div>
  );
}

// Temporary placeholders — replaced by real chart components in subsequent tasks

function MetricsStatCards({ agg }: { agg: MetricsAggregate }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Runs" value={String(agg.totalRuns)} />
      <StatCard
        label="Pass Rate"
        value={`${(agg.passRate * 100).toFixed(1)}%`}
      />
      <StatCard
        label={agg.avgPrimaryMetric ? `Avg ${agg.avgPrimaryMetric.name}` : "Avg Metric"}
        value={
          agg.avgPrimaryMetric != null
            ? Number.isInteger(agg.avgPrimaryMetric.value)
              ? String(agg.avgPrimaryMetric.value)
              : agg.avgPrimaryMetric.value.toFixed(4)
            : "—"
        }
      />
      <StatCard
        label="Avg Duration"
        value={agg.avgDurationMs != null ? formatMs(agg.avgDurationMs) : "—"}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StepDurationPlaceholder() {
  return <ChartPlaceholder label="Avg Step Duration" />;
}

function RecentRunsPlaceholder() {
  return <ChartPlaceholder label="Recent Runs" />;
}

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
