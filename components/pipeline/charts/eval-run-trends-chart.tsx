"use client";

import { useMemo } from "react";
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
import type { EvalRunDataPoint } from "../metrics-dashboard";
import { CHART_COLORS, TOOLTIP_CONTENT_STYLE } from "./chart-constants";

interface Props {
  dataPoints: EvalRunDataPoint[];
  metricNames: string[];
}

export function EvalRunTrendsChart({ dataPoints, metricNames }: Props) {
  const displayMetrics = metricNames.slice(0, 5);

  const chartData = useMemo(
    () =>
      dataPoints.map((p) => ({
        date: p.date,
        ...p.metrics,
      })),
    [dataPoints],
  );

  if (displayMetrics.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">Eval Run Trends</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              className="text-[10px] fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              className="text-[10px] fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {displayMetrics.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
