"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { EvalRunDataPoint } from "../metrics-dashboard";
import { CHART_COLORS } from "./chart-constants";

function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const points = data.map((v, i) => ({ i, v }));
  const gradientId = `spark-${id}`;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  dataPoints: EvalRunDataPoint[];
  metricNames: string[];
}

export function EvalRunSparklineCards({ dataPoints, metricNames }: Props) {
  const displayMetrics = metricNames.slice(0, 5);

  return (
    <div className={cn(
      "grid gap-4",
      displayMetrics.length <= 3
        ? "grid-cols-1 sm:grid-cols-3"
        : displayMetrics.length === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-5",
    )}>
      {displayMetrics.map((name, idx) => {
        const values = dataPoints.map((p) => p.metrics[name] ?? 0);
        const current = values[values.length - 1];
        const previous = values[values.length - 2];
        const delta = current - previous;
        const color = CHART_COLORS[idx % CHART_COLORS.length];

        return (
          <Card key={name} size="sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground capitalize">{name}</p>
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium",
                    delta >= 0 ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                </span>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground mt-0.5">
                {current.toFixed(1)}
              </p>
              <Sparkline data={values} color={color} id={`${name}-${idx}`} />
              <p className="text-[10px] text-muted-foreground mt-1">
                {dataPoints.length} eval runs
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
