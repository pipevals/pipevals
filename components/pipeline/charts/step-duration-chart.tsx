"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MetricRunEntry } from "../metrics-dashboard";

interface Props {
  runs: MetricRunEntry[];
}

const chartConfig: ChartConfig = {
  avgMs: {
    label: "Avg Duration",
    color: "hsl(var(--chart-3))",
  },
};

export function StepDurationChart({ runs }: Props) {
  const chartData = useMemo(() => {
    // Accumulate durations per step label across all runs
    const acc = new Map<string, { total: number; count: number }>();

    for (const run of runs) {
      for (const step of run.steps) {
        if (step.durationMs == null) continue;
        const entry = acc.get(step.label) ?? { total: 0, count: 0 };
        entry.total += step.durationMs;
        entry.count++;
        acc.set(step.label, entry);
      }
    }

    return Array.from(acc.entries())
      .map(([label, { total, count }]) => ({
        label,
        avgMs: Math.round(total / count),
      }))
      .sort((a, b) => b.avgMs - a.avgMs); // slowest first
  }, [runs]);

  if (chartData.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">
        Avg Step Duration
      </h3>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={90}
            fontSize={11}
          />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(val: number) =>
              val < 1000 ? `${val}ms` : `${(val / 1000).toFixed(1)}s`
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => {
                  const ms = value as number;
                  return ms < 1000
                    ? `${ms}ms`
                    : `${(ms / 1000).toFixed(2)}s`;
                }}
              />
            }
          />
          <Bar
            dataKey="avgMs"
            fill="var(--color-avgMs)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
