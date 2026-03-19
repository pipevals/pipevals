"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BrowserIcon,
  Database01Icon,
  Search01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";
import type { DatasetSummary } from "@/lib/api/datasets";
import { handleApiError } from "@/lib/handle-api-error";

interface DatasetListProps {
  initialDatasets: DatasetSummary[];
}

export function DatasetList({ initialDatasets }: DatasetListProps) {
  const router = useRouter();
  const [datasets, setDatasets] = useState(initialDatasets);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schemaKeys, setSchemaKeys] = useState<string[]>([""]);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      search.trim()
        ? datasets.filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase()),
          )
        : datasets,
    [datasets, search],
  );

  const fetchDatasets = useCallback(async () => {
    try {
      const res = await fetch("/api/datasets");
      if (!res.ok) throw new Error("Failed to load datasets");
      setDatasets(await res.json());
    } catch (e) {
      await handleApiError(e);
    }
  }, []);

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res);
        return;
      }
      await fetchDatasets();
    } catch (e) {
      await handleApiError(e);
    }
  };

  const onCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError("Name is required");
      return;
    }

    const validKeys = schemaKeys
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    if (validKeys.length === 0) {
      setCreateError("At least one schema key is required");
      return;
    }

    const uniqueKeys = new Set(validKeys);
    if (uniqueKeys.size !== validKeys.length) {
      setCreateError("Schema keys must be unique");
      return;
    }

    setCreateError(null);
    const schema: Record<string, string> = {};
    for (const key of validKeys) schema[key] = "";

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          schema,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error ?? "Failed to create dataset");
        return;
      }

      const created = await res.json();
      setName("");
      setDescription("");
      setSchemaKeys([""]);
      setCreating(false);
      router.push(`/datasets/${created.id}`);
    } catch (e) {
      setCreateError("Failed to create dataset");
      await handleApiError(e);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HugeiconsIcon icon={Database01Icon} size={16} />
            Datasets
          </h1>
          <Button onClick={() => setCreating(true)} size="sm">
            New Dataset
          </Button>
        </div>
      </div>

      <main className="px-8 py-8 flex flex-col gap-6">
        {/* Search */}
        <div className="relative max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search datasets"
            name="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets..."
            className="pl-7"
          />
        </div>

        {/* Dataset list */}
        <div
          className={`flex flex-col ${filtered.length > 0 ? "border-t border-border" : ""}`}
        >
          {filtered.length === 0 && search && (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={BrowserIcon} size={24} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No datasets match your search</EmptyTitle>
                <EmptyDescription>Try a different search term</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {filtered.length === 0 && !search && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No datasets yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a dataset to run evaluations at scale
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreating(true)}
              >
                Create your first dataset
              </Button>
            </div>
          )}

          {filtered.map((d) => (
            <div
              key={d.id}
              className="group flex items-center justify-between border-b border-border py-4 hover:bg-muted/40 -mx-2 px-2 rounded-sm transition-colors"
            >
              <Link
                href={`/datasets/${d.id}`}
                className="flex flex-col gap-1.5 min-w-0 flex-1"
              >
                <span className="text-sm font-medium text-foreground">
                  {d.name}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{d.itemCount} items</span>
                  <span>
                    {Object.keys(d.schema).join(", ")}
                  </span>
                  {d.description && (
                    <span className="truncate">{d.description}</span>
                  )}
                </span>
              </Link>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" aria-label={`Delete ${d.name}`}>
                      <HugeiconsIcon icon={Delete01Icon} size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete dataset?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{d.name}</strong> and all its items will be
                        permanently deleted. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(d.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Dataset</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Name
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Golden Set"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Description (optional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this dataset is for..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Schema keys
              </label>
              <p className="text-xs text-muted-foreground">
                Define the fields each item will have
              </p>
              <div className="flex flex-col gap-2">
                {schemaKeys.map((key, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const next = [...schemaKeys];
                        next[i] = e.target.value;
                        setSchemaKeys(next);
                      }}
                      placeholder={
                        i === 0 ? "e.g., prompt" : "e.g., expected"
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (key.trim()) {
                            setSchemaKeys([...schemaKeys, ""]);
                          }
                        }
                      }}
                    />
                    {schemaKeys.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Remove key"
                        onClick={() =>
                          setSchemaKeys(schemaKeys.filter((_, j) => j !== i))
                        }
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSchemaKeys([...schemaKeys, ""])}
                  className="w-fit"
                >
                  Add key
                </Button>
              </div>
            </div>
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setDescription("");
                  setSchemaKeys([""]);
                  setCreateError(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={onCreate}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
