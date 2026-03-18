"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
  CheckmarkCircle01Icon,
  Copy01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import type { PipelineSummary } from "@/lib/api/pipelines";
import { handleApiError } from "@/lib/handle-api-error";
import { slugify } from "@/lib/slugify";

interface PipelineListProps {
  initialPipelines: PipelineSummary[];
}

export function PipelineList({ initialPipelines }: PipelineListProps) {
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copyCurl = useCallback(
    (id: string) => {
      const pipeline = pipelines.find((p) => p.id === id);
      const schema = pipeline?.triggerSchema;
      const hasSchema =
        schema && typeof schema === "object" && Object.keys(schema).length > 0;
      const body = hasSchema ? JSON.stringify(schema) : "{}";
      const escaped = body.replace(/'/g, "'\\''");
      const cmd = `curl -X POST ${window.location.origin}/api/pipelines/${id}/runs \\\n  -H "Content-Type: application/json" \\\n  -d '${escaped}'`;
      navigator.clipboard.writeText(cmd);
      setCopiedId(id);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    },
    [pipelines],
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? pipelines.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase()),
          )
        : pipelines,
    [pipelines, search],
  );

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await fetch("/api/pipelines");
      if (!res.ok) throw new Error("Failed to load pipelines");
      setPipelines(await res.json());
      setError(null);
    } catch {
      setError("Failed to load pipelines");
    }
  }, []);

  const [createController, setCreateController] =
    useState<AbortController | null>(null);

  const onCreate = async () => {
    if (!name.trim()) return;
    setError(null);
    const controller = new AbortController();
    setCreateController(controller);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? "Failed to create pipeline";
        setError(msg);
        await handleApiError(new Error(msg));
        return;
      }
      setName("");
      setCreating(false);
      await fetchPipelines();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Failed to create pipeline");
      await handleApiError(e);
    } finally {
      setCreateController(null);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res);
        return;
      }
      await fetchPipelines();
    } catch (e) {
      setError("Failed to delete pipeline");
      await handleApiError(e);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <h1 className="text-sm font-semibold text-foreground">Pipelines</h1>
          <Button onClick={() => setCreating(true)} size="sm">
            New Pipeline
          </Button>
        </div>
      </div>

      <main className="px-8 py-8 flex flex-col gap-6">
        {/* Create form */}
        {creating && (
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">New Pipeline</p>
            <input
              autoFocus
              aria-label="Pipeline name"
              name="pipeline-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
              placeholder="Pipeline name"
              className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {name && (
              /[a-z0-9]/i.test(name) ? (
                <p className="text-xs text-muted-foreground">
                  Slug: {slugify(name)}
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  Name must include at least one letter or number
                </p>
              )
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={onCreate}>
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  createController?.abort();
                  setCreating(false);
                  setName("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            aria-label="Search pipelines"
            name="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pipelines…"
            className="w-full border-0 border-b border-border bg-transparent pb-2 pl-7 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors"
          />
        </div>

        {/* Error */}
        {error && !creating && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/50 py-16">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="ghost" onClick={fetchPipelines}>
              Retry
            </Button>
          </div>
        )}

        {/* Pipeline list */}
        {!error && (
          <div
            className={`flex flex-col ${filtered.length > 0 ? "border-t border-border" : ""}`}
          >
            {filtered.length === 0 && (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={BrowserIcon} size={24} aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search
                      ? "No pipelines match your search"
                      : "No pipelines yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search
                      ? "Try a different search term"
                      : "Create one to get started"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {filtered.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between border-b border-border py-4 hover:bg-muted/40 -mx-2 px-2 rounded-sm transition-colors"
              >
                <Link
                  href={`/pipelines/${p.id}`}
                  className="flex flex-col gap-1.5 min-w-0 flex-1"
                >
                  <span className="text-sm font-medium text-foreground">
                    {p.name}
                  </span>
                  {p.description ? (
                    <span className="text-xs text-muted-foreground truncate">
                      {p.description}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm bg-background">
                      POST /api/pipelines/{p.id}/runs
                    </span>
                  )}
                </Link>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyCurl(p.id)}
                        aria-label="Copy curl command"
                      >
                        {copiedId === p.id ? (
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            size={14}
                          />
                        ) : (
                          <HugeiconsIcon icon={Copy01Icon} size={14} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy cURL command</TooltipContent>
                  </Tooltip>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/pipelines/${p.id}/runs`}>Runs</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/pipelines/${p.id}`}>Edit</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{p.name}</strong> and all its runs will be
                          permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(p.id)}
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
        )}
      </main>
    </>
  );
}
