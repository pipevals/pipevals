"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { formatShortDate, formatDateTime } from "@/lib/format";
import type { MetricRunEntry } from "../metrics-dashboard";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

interface Props {
  runs: MetricRunEntry[];
  metricNames: string[];
}

type XAxisMode = "run" | "time";

export function MetricTrendsChart({ runs, metricNames }: Props) {
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("run");

  const numericMetrics = useMemo(() => {
    return metricNames.filter((name) =>
      runs.some((r) => typeof r.metrics[name] === "number"),
    );
  }, [runs, metricNames]);

  // "By run" mode: one point per individual run
  const perRunData = useMemo(() => {
    return runs.map((run, index) => {
      const point: Record<string, unknown> = {
        runIndex: index + 1,
        createdAt: run.createdAt,
      };
      for (const name of numericMetrics) {
        const val = run.metrics[name];
        point[name] = typeof val === "number" ? val : undefined;
      }
      return point;
    });
  }, [runs, numericMetrics]);

  // "By time" mode: bucket eval run items into one averaged point, keep ad-hoc as-is
  const bucketedData = useMemo(() => {
    // Group runs by evalRunId
    const evalGroups = new Map<string, MetricRunEntry[]>();
    const adhocRuns: MetricRunEntry[] = [];

    for (const run of runs) {
      if (run.evalRunId) {
        const group = evalGroups.get(run.evalRunId);
        if (group) group.push(run);
        else evalGroups.set(run.evalRunId, [run]);
      } else {
        adhocRuns.push(run);
      }
    }

    const points: { createdAt: string; label: string; [key: string]: unknown }[] = [];

    // Ad-hoc runs as individual points
    for (const run of adhocRuns) {
      const point: Record<string, unknown> = {
        createdAt: run.createdAt,
        label: "Ad-hoc",
      };
      for (const name of numericMetrics) {
        const val = run.metrics[name];
        point[name] = typeof val === "number" ? val : undefined;
      }
      points.push(point as typeof points[number]);
    }

    // Eval runs as averaged points
    for (const [, groupRuns] of evalGroups) {
      const completed = groupRuns.filter((r) => r.status === "completed");
      if (completed.length === 0) continue;

      // Use earliest createdAt as the point's timestamp
      const createdAt = groupRuns.reduce(
        (min, r) => (r.createdAt < min ? r.createdAt : min),
        groupRuns[0].createdAt,
      );

      const point: Record<string, unknown> = {
        createdAt,
        label: `Eval (${groupRuns.length} items)`,
      };

      for (const name of numericMetrics) {
        const values = completed
          .map((r) => r.metrics[name])
          .filter((v): v is number => typeof v === "number");
        if (values.length > 0) {
          point[name] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }

      points.push(point as typeof points[number]);
    }

    // Sort chronologically
    points.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return points;
  }, [runs, numericMetrics]);

  if (numericMetrics.length === 0) return null;

  const chartData = xAxisMode === "run" ? perRunData : bucketedData;
  const xKey = xAxisMode === "run" ? "runIndex" : "createdAt";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Metric Trends</h3>
        <ToggleGroup
          type="single"
          size="sm"
          value={xAxisMode}
          onValueChange={(v) => {
            if (v) setXAxisMode(v as XAxisMode);
          }}
        >
          <ToggleGroupItem value="run" className="text-xs px-2.5">
            By run
          </ToggleGroupItem>
          <ToggleGroupItem value="time" className="text-xs px-2.5">
            By time
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={xKey}
              className="text-[10px] fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={
                xAxisMode === "time"
                  ? (val: string) => formatShortDate(val)
                  : undefined
              }
            />
            <YAxis
              className="text-[10px] fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.375rem",
                fontSize: "12px",
              }}
              labelFormatter={(label) => {
                if (xAxisMode === "time") {
                  return formatDateTime(String(label));
                }
                return `Run #${label}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {numericMetrics.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
