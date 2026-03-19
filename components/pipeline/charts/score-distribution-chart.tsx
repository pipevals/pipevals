"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MetricRunEntry } from "../metrics-dashboard";

const BUCKET_COUNT = 10;

interface Props {
  runs: MetricRunEntry[];
  metricNames: string[];
}

function buildHistogram(values: number[]) {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Handle case where all values are the same
  if (min === max) {
    return [{ bucket: String(min), count: values.length }];
  }

  const step = (max - min) / BUCKET_COUNT;
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    low: min + i * step,
    high: min + (i + 1) * step,
    count: 0,
  }));

  for (const v of values) {
    // Last bucket includes the upper bound
    const idx = Math.min(
      Math.floor((v - min) / step),
      BUCKET_COUNT - 1,
    );
    buckets[idx].count++;
  }

  return buckets.map((b) => ({
    bucket: `${b.low.toPrecision(3)}`,
    count: b.count,
  }));
}

const chartConfig: ChartConfig = {
  count: {
    label: "Frequency",
    color: "var(--color-chart-1)",
  },
};

export function ScoreDistributionChart({ runs, metricNames }: Props) {
  // Filter to only numeric metrics
  const numericMetrics = useMemo(() => {
    return metricNames.filter((name) =>
      runs.some((r) => typeof r.metrics[name] === "number"),
    );
  }, [runs, metricNames]);

  // Store only the user's explicit pick; null = "use default"
  const [userPick, setUserPick] = useState<string | null>(null);

  // Derive the effective metric: user pick if still valid, otherwise first available
  const selectedMetric =
    userPick && numericMetrics.includes(userPick)
      ? userPick
      : numericMetrics[0] ?? "";

  const histogramData = useMemo(() => {
    if (!selectedMetric) return [];
    const values = runs
      .map((r) => r.metrics[selectedMetric])
      .filter((v): v is number => typeof v === "number");
    return buildHistogram(values);
  }, [runs, selectedMetric]);

  if (numericMetrics.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Score Distribution
        </h3>
        <Select value={selectedMetric} onValueChange={setUserPick}>
          <SelectTrigger className="h-7 w-auto min-w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {numericMetrics.map((name) => (
              <SelectItem key={name} value={name} className="text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <BarChart key={selectedMetric} data={histogramData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={30}
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => `Value: ${label}`}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
