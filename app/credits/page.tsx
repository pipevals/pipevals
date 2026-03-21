import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { WorkflowSquare05Icon } from "@hugeicons/core-free-icons";
import { CreditsContent } from "./credits-content";

export const metadata: Metadata = {
  title: "Credits",
};

export default function CreditsPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground hover:opacity-80 transition-opacity"
          >
            <HugeiconsIcon icon={WorkflowSquare05Icon} size={18} />
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
      </header>
      <CreditsContent />
    </div>
  );
}
