"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Editor", segment: "" },
  { label: "Metrics", segment: "/metrics" },
  { label: "Runs", segment: "/runs" },
] as const;

export function PipelineSubNav({ pipelineId }: { pipelineId: string }) {
  const pathname = usePathname();
  const basePath = `/pipelines/${pipelineId}`;

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex h-10 items-center gap-4 px-8">
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
                "relative text-xs font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {isActive && (
                <span className="absolute -bottom-[9px] left-0 right-0 h-px bg-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
