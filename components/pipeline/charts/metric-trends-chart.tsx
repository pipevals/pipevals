"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import type { MetricRunEntry } from "../metrics-dashboard";

// Palette for metric series — cycles if more than 5 metrics
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface Props {
  runs: MetricRunEntry[];
  metricNames: string[];
}

type XAxisMode = "run" | "time";

export function MetricTrendsChart({ runs, metricNames }: Props) {
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("run");

  // Only chart numeric metrics
  const numericMetrics = useMemo(() => {
    return metricNames.filter((name) =>
      runs.some((r) => typeof r.metrics[name] === "number"),
    );
  }, [runs, metricNames]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (let i = 0; i < numericMetrics.length; i++) {
      const name = numericMetrics[i];
      config[name] = {
        label: name,
        color: COLORS[i % COLORS.length],
      };
    }
    return config;
  }, [numericMetrics]);

  const chartData = useMemo(() => {
    return runs.map((run, index) => {
      const point: Record<string, unknown> = {
        runIndex: index + 1,
        createdAt: run.createdAt,
      };
      for (const name of numericMetrics) {
        const val = run.metrics[name];
        // Only include numeric values — skip strings, nulls, objects
        point[name] = typeof val === "number" ? val : undefined;
      }
      return point;
    });
  }, [runs, numericMetrics]);

  if (numericMetrics.length === 0) return null;

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
      <ChartContainer config={chartConfig} className="h-72 w-full">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={
              xAxisMode === "time"
                ? (val: string) => {
                    const d = new Date(val);
                    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
                  }
                : undefined
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  if (!payload?.[0]?.payload) return "";
                  const p = payload[0].payload as Record<string, unknown>;
                  if (xAxisMode === "time" && typeof p.createdAt === "string") {
                    return new Date(p.createdAt).toLocaleString();
                  }
                  return `Run #${p.runIndex}`;
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {numericMetrics.map((name) => (
            <Area
              key={name}
              dataKey={name}
              type="monotone"
              fill={`var(--color-${name})`}
              fillOpacity={0.1}
              stroke={`var(--color-${name})`}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
