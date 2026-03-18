"use client";

import { useCallback, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

  const copyCurl = useCallback((id: string) => {
    const cmd = `curl -X POST ${window.location.origin}/api/pipelines/${id}/runs \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

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
        <div className="px-8 py-3 flex items-center justify-between">
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
          <svg
            aria-hidden="true"
            className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
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
                    <svg
                      aria-hidden
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                      <path d="M2 10h20" />
                    </svg>
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
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm bg-background">
                        POST /api/pipelines/{p.id}/runs
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          copyCurl(p.id);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copy curl command"
                      >
                        {copiedId === p.id ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              width="14"
                              height="14"
                              x="8"
                              y="8"
                              rx="2"
                              ry="2"
                            />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                    </span>
                  )}
                </Link>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
