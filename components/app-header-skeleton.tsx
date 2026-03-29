import Link from "next/link";
import { PipevalsLogo } from "@/components/pipevals-logo";
import { Skeleton } from "@/components/ui/skeleton";

/** Static header chrome for loading.tsx files. Renders real nav links with a skeleton avatar. */
export function AppHeaderSkeleton() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-8">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground hover:opacity-80 transition-opacity"
        >
          <PipevalsLogo size={18} />
        </Link>

        <nav className="flex items-center gap-5">
          {[
            { href: "/pipelines", label: "Pipelines" },
            { href: "/datasets", label: "Datasets" },
            { href: "/settings", label: "Settings" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <Skeleton className="h-7 w-7 rounded-full" />
    </header>
  );
}
