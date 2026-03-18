"use client";

import { useRef, useState } from "react";
import type { GatewayModel } from "@/lib/pipeline/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

/** Capitalize first letter of each word, e.g. "openai" → "Openai" */
function formatProvider(provider: string) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Group models by provider, sorted alphabetically. */
function groupByProvider(models: GatewayModel[]) {
  const groups: Record<string, GatewayModel[]> = {};
  for (const m of models) {
    (groups[m.provider] ??= []).push(m);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function ModelCombobox({
  models,
  value,
  onValueChange,
  fallback,
}: {
  models: GatewayModel[];
  value: string;
  onValueChange: (value: string) => void;
  fallback?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Graceful degradation: no models → plain text input
  if (models.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="openai/gpt-4o"
          className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-[10px] text-muted-foreground">
          Could not load models — type a provider/model string manually.
        </span>
      </div>
    );
  }

  const grouped = groupByProvider(models);

  return (
    <div className="flex flex-col gap-1">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-7 w-full items-center justify-between rounded-md border border-border bg-background px-2 text-xs text-foreground hover:bg-muted/50 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value || "Select model…"}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-3 shrink-0 opacity-50"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search models…"
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                search.includes("/") &&
                listRef.current?.querySelector("[cmdk-empty]")
              ) {
                e.preventDefault();
                onValueChange(search);
                setSearch("");
                setOpen(false);
              }
            }}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>
              {search.includes("/") ? (
                <button
                  type="button"
                  className="mx-auto block text-xs text-primary hover:underline"
                  onClick={() => {
                    onValueChange(search);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  Use &ldquo;{search}&rdquo;
                </button>
              ) : (
                "No models found."
              )}
            </CommandEmpty>
            {grouped.map(([provider, items]) => (
              <CommandGroup key={provider} heading={formatProvider(provider)}>
                {items.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.id}
                    data-checked={m.id === value || undefined}
                    onSelect={(id) => {
                      onValueChange(id);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    {m.id}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {fallback && (
      <span className="text-[10px] text-muted-foreground">
        Add AI_GATEWAY_API_KEY for account-specific availability.
      </span>
    )}
    </div>
  );
}
