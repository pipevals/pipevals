"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Logo = () => null;

function ThemeMenuItems() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = resolvedTheme === "dark";
  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
        {isDark ? (
          <>
            <HugeiconsIcon icon={Sun01Icon} size={16} />
            Light mode
          </>
        ) : (
          <>
            <HugeiconsIcon icon={Moon01Icon} size={16} />
            Dark mode
          </>
        )}
      </DropdownMenuItem>
    </>
  );
}

interface AppHeaderUser {
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

interface AppHeaderProps {
  user?: AppHeaderUser | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-8">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-foreground hover:opacity-80 transition-opacity"
      >
        <Logo />
        <span className="text-sm font-semibold tracking-tight">Pipevals</span>
      </Link>

      <div className="flex items-center gap-7">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border text-[11px] font-medium text-muted-foreground hover:ring-2 hover:ring-ring transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt=""
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  {user.name && (
                    <p className="text-sm font-medium">{user.name}</p>
                  )}
                  {user.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
