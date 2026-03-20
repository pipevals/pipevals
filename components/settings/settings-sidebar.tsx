"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/settings/api-keys", label: "API Keys", icon: Key01Icon },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 shrink-0 border-r border-border px-4 py-6">
      <h2 className="mb-4 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Settings
      </h2>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={icon} size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
