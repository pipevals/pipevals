"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { PipelineNodeData } from "@/lib/stores/pipeline-builder";
import type { StepResultStatus } from "@/lib/stores/run-viewer";
import { StatusBadge } from "./status-badge";

interface BaseNodeProps extends NodeProps {
  data: PipelineNodeData;
  icon: React.ReactNode;
  color: string;
  outputs?: { id: string; label: string }[];
}

export function BaseNode({
  data,
  icon,
  color,
  selected,
  outputs,
}: BaseNodeProps) {
  const singleOutput = !outputs || outputs.length === 0;
  const stepStatus = data.stepStatus as StepResultStatus | undefined;

  return (
    <div
      className={cn(
        "relative min-w-[160px] rounded-lg border bg-background shadow-sm transition-shadow",
        selected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-muted-foreground"
      />

      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white",
            color,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">
            {data.label || "Untitled"}
          </div>
          {stepStatus && (
            <div className="mt-1">
              <StatusBadge status={stepStatus} />
            </div>
          )}
        </div>
      </div>

      {singleOutput ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-muted-foreground"
        />
      ) : (
        <div className="flex justify-around border-t border-border px-1 py-1">
          {outputs.map((output) => (
            <div key={output.id} className="relative flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground">
                {output.label}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={output.id}
                className="!relative !left-0 !top-0 !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !rounded-full !border-2 !border-background !bg-muted-foreground"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
