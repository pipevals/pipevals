"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartLineData02Icon } from "@hugeicons/core-free-icons";

const MetricTrendsChart = dynamic(() =>
  import("./charts/metric-trends-chart").then((m) => m.MetricTrendsChart),
);
const EvalRunTrendsChart = dynamic(() =>
  import("./charts/eval-run-trends-chart").then((m) => m.EvalRunTrendsChart),
);
const EvalRunSparklineCards = dynamic(() =>
  import("./charts/eval-run-sparkline-cards").then((m) => m.EvalRunSparklineCards),
);
import type {
  MetricRunEntry,
  MetricsResponse,
} from "@/lib/pipeline/types/metrics";
import type { EvalRunSummary, DatasetInfo } from "@/lib/pipeline/types/shared";

export type { MetricRunEntry };

export interface MetricsAggregate {
  totalRuns: number;
  passRate: number;
  avgDurationMs: number | null;
  avgPrimaryMetric: { name: string; value: number } | null;
  metricNames: string[];
  runs: MetricRunEntry[];
}

export interface EvalRunDataPoint {
  evalRunId: string;
  datasetName: string;
  date: string;
  metrics: Record<string, number>;
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

  const metricNameSet = new Set<string>();
  for (const run of runs) {
    for (const key of Object.keys(run.metrics)) {
      metricNameSet.add(key);
    }
  }
  const metricNames = Array.from(metricNameSet).sort();

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

export function MetricsDashboard({ pipelineId }: { pipelineId: string }) {
  const { data, error, isLoading } = useSWR<MetricsResponse>(
    `/api/pipelines/${pipelineId}/runs/metrics`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: evalRuns } = useSWR<EvalRunSummary[]>(
    `/api/pipelines/${pipelineId}/eval-runs`,
    fetcher,
  );

  const { data: datasets } = useSWR<DatasetInfo[]>("/api/datasets", fetcher);

  const datasetMap = useMemo(
    () => new Map((datasets ?? []).map((d) => [d.id, d.name])),
    [datasets],
  );

  // Build eval run data points by grouping metrics entries by evalRunId
  const evalRunDataPoints = useMemo(() => {
    if (!data || !evalRuns) return [];

    const evalRunMap = new Map(evalRuns.map((er) => [er.id, er]));

    // Group metric entries by evalRunId
    const groups = new Map<string, MetricRunEntry[]>();
    for (const run of data.runs) {
      if (!run.evalRunId) continue;
      const group = groups.get(run.evalRunId);
      if (group) group.push(run);
      else groups.set(run.evalRunId, [run]);
    }

    const points: EvalRunDataPoint[] = [];
    for (const [evalRunId, runs] of groups) {
      const er = evalRunMap.get(evalRunId);
      if (!er) continue;

      // Compute average of each numeric metric across completed runs
      const completedRuns = runs.filter((r) => r.status === "completed");
      const metricSums: Record<string, { sum: number; count: number }> = {};
      for (const run of completedRuns) {
        for (const [key, value] of Object.entries(run.metrics)) {
          if (typeof value === "number") {
            if (!metricSums[key]) metricSums[key] = { sum: 0, count: 0 };
            metricSums[key].sum += value;
            metricSums[key].count++;
          }
        }
      }

      const metrics: Record<string, number> = {};
      for (const [key, { sum, count }] of Object.entries(metricSums)) {
        metrics[key] = sum / count;
      }

      points.push({
        evalRunId,
        datasetName: datasetMap.get(er.datasetId) ?? er.datasetId.slice(0, 8),
        date: new Date(er.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        metrics,
      });
    }

    // Sort chronologically
    points.sort((a, b) => {
      const erA = evalRunMap.get(a.evalRunId);
      const erB = evalRunMap.get(b.evalRunId);
      return (erA?.createdAt ?? "").localeCompare(erB?.createdAt ?? "");
    });

    return points;
  }, [data, evalRuns, datasetMap]);

  // Collect metric names from eval run data points
  const evalMetricNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of evalRunDataPoints) {
      for (const key of Object.keys(p.metrics)) names.add(key);
    }
    return Array.from(names).sort();
  }, [evalRunDataPoints]);

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
      {evalRunDataPoints.length >= 2 && (
        <EvalRunSparklineCards
          dataPoints={evalRunDataPoints}
          metricNames={evalMetricNames}
        />
      )}
      {evalRunDataPoints.length >= 2 && (
        <EvalRunTrendsChart
          dataPoints={evalRunDataPoints}
          metricNames={evalMetricNames}
        />
      )}
      {agg.metricNames.length > 0 && (
        <MetricTrendsChart runs={agg.runs} metricNames={agg.metricNames} />
      )}
    </div>
  );
}

function MetricsStatCards({ agg }: { agg: MetricsAggregate }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
