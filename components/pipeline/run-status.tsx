import { cn } from "@/lib/utils";

export const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; textClass: string }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-muted-foreground/50",
    textClass: "text-muted-foreground",
  },
  running: {
    label: "Running",
    dotClass: "bg-running motion-safe:animate-pulse",
    textClass: "text-running",
  },
  awaiting_review: {
    label: "Awaiting review",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-pass",
    textClass: "text-pass",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-fail",
    textClass: "text-fail",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
};

export function StatusDot({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          config.dotClass,
        )}
      />
      <span className={cn("text-xs", config.textClass)}>{config.label}</span>
    </span>
  );
}
