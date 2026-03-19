"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { shortId } from "@/lib/format";
import { HugeiconsIcon } from "@hugeicons/react";
import { WorkflowSquare05Icon } from "@hugeicons/core-free-icons";

const NAV_ITEMS = [
  { label: "Editor", segment: "" },
  { label: "Runs", segment: "/runs" },
  { label: "Tasks", segment: "/tasks" },
  { label: "Metrics", segment: "/metrics" },
] as const;

export function PipelineSubNav({
  pipelineId,
  pipelineSlug,
  actions,
  pendingTaskCount,
}: {
  pipelineId: string;
  pipelineSlug?: string | null;
  actions?: React.ReactNode;
  pendingTaskCount?: number;
}) {
  const pathname = usePathname();
  const basePath = `/pipelines/${pipelineId}`;

  return (
    <div className="border-b border-border bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/pipelines"
              className="rounded-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to pipelines"
            >
              <HugeiconsIcon icon={WorkflowSquare05Icon} size={16} />
            </Link>
            <Link
              href="/pipelines"
              className="max-w-[200px] truncate rounded-sm text-sm font-medium text-foreground hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {pipelineSlug ?? shortId(pipelineId)}
            </Link>
          </div>
          <span className="h-4 w-px bg-border" />
          <nav className="flex h-full items-stretch gap-4">
            {NAV_ITEMS.map(({ label, segment }) => {
              const href = `${basePath}${segment}`;
              const isActive =
                segment === ""
                  ? pathname === basePath
                  : pathname.startsWith(href);

              return (
                <Link
                  key={segment}
                  href={href}
                  className={cn(
                    "flex items-center border-b text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {label === "Tasks" && pendingTaskCount != null && pendingTaskCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                      {pendingTaskCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        {actions && <div className="flex items-center">{actions}</div>}
      </div>
    </div>
  );
}
