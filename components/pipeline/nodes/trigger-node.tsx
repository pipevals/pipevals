"use client";

import { useEffect } from "react";
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";

export function TriggerNode({ id, selected }: NodeProps) {
  const triggerSchema = usePipelineBuilderStore((s) => s.triggerSchema);
  const keys = Object.keys(triggerSchema);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, keys.join(","), updateNodeInternals]);

  return (
    <div
      className={cn(
        "relative min-w-[160px] rounded-lg border-2 border-dashed border-green-500 bg-green-50 dark:bg-green-950/30 shadow-sm transition-shadow",
        selected ? "ring-2 ring-green-500 shadow-md" : "hover:shadow-md",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-green-600 text-xs font-bold text-white">
          ▶
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-green-700 dark:text-green-400">
            Trigger
          </div>
        </div>
      </div>

      {/* Output handles or placeholder */}
      {keys.length === 0 ? (
        <div className="border-t border-green-200 dark:border-green-800 px-3 py-2">
          <p className="text-[10px] text-muted-foreground leading-tight">
            No inputs defined —
            <br />
            add fields in the Trigger panel
          </p>
          {/* Single generic output handle when schema is empty */}
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-green-500"
          />
        </div>
      ) : (
        <div className="flex justify-around border-t border-green-200 dark:border-green-800 px-1 py-1">
          {keys.map((key) => (
            <div
              key={key}
              className="relative flex flex-col items-center"
            >
              <span className="text-[10px] text-muted-foreground">
                {key}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={key}
                className="!relative !left-0 !top-0 !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !rounded-full !border-2 !border-background !bg-green-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
