"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useApiKeyStore } from "@/lib/stores/api-key";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PlayIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import type { PipelineSummary, TemplateSummary } from "@/lib/api/pipelines";
import { handleApiError } from "@/lib/handle-api-error";
import { slugify } from "@/lib/slugify";
import { useOrgRoleStore, selectReadOnly } from "@/lib/stores/org-role";

function TemplateCard({
  template,
  selected,
  onClick,
  className,
}: {
  template: TemplateSummary;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
        selected
          ? "border-ring bg-muted/60 ring-1 ring-ring"
          : "border-border bg-background hover:bg-muted/40"
      } ${className ?? ""}`}
    >
      <span className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{template.name}</span>
        {template.organizationId === null && (
          <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            Built-in
          </span>
        )}
      </span>
      {template.description && (
        <span className="block text-muted-foreground mt-0.5 line-clamp-2">
          {template.description}
        </span>
      )}
    </button>
  );
}

interface PipelineListProps {
  initialPipelines: PipelineSummary[];
  templates: TemplateSummary[];
}

export function PipelineList({ initialPipelines, templates }: PipelineListProps) {
  const readOnly = useOrgRoleStore(selectReadOnly);
  const keyPrefix = useApiKeyStore((s) => s.keyPrefix);
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copyCurl = useCallback(
    (id: string, type: "run" | "eval-run" = "run") => {
      const pipeline = pipelines.find((p) => p.id === id);
      const apiKeyLine = keyPrefix
        ? `\\\n  -H "x-api-key: ${keyPrefix}..." `
        : "";
      let cmd: string;

      if (type === "eval-run") {
        cmd = `curl -X POST ${window.location.origin}/api/pipelines/${id}/eval-runs ${apiKeyLine}\\\n  -H "Content-Type: application/json" \\\n  -d '{"datasetId": "<DATASET_ID>"}'`.replace(/ {2,}\\/g, " \\");
      } else {
        const schema = pipeline?.triggerSchema;
        const hasSchema =
          schema && typeof schema === "object" && Object.keys(schema).length > 0;
        const body = hasSchema ? JSON.stringify(schema) : "{}";
        const escaped = body.replace(/'/g, "'\\''");
        cmd = `curl -X POST ${window.location.origin}/api/pipelines/${id}/runs ${apiKeyLine}\\\n  -H "Content-Type: application/json" \\\n  -d '${escaped}'`.replace(/ {2,}\\/g, " \\");
      }

      navigator.clipboard.writeText(cmd);
      setCopiedId(id);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    },
    [pipelines, keyPrefix],
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
        body: JSON.stringify({
          name: name.trim(),
          ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
        }),
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
      setSelectedTemplateId(null);
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
          <div className="relative max-w-md flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search pipelines"
              name="search"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pipelines…"
              className="h-6 pl-7 text-xs"
            />
          </div>
          <Button onClick={() => setCreating(true)} size="sm" disabled={readOnly}>
            New Pipeline
          </Button>
        </div>
      </div>

      <main className="px-8 py-6 flex flex-col gap-6">
        {/* Create form */}
        {creating && (
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">New Pipeline</p>

            {/* Template picker */}
            {templates.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Start from a template</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      selectedTemplateId === null
                        ? "border-ring bg-muted/60 ring-1 ring-ring"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-medium text-foreground">Start from scratch</span>
                    <span className="block text-muted-foreground mt-0.5">Empty pipeline</span>
                  </button>
                  {templates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      selected={selectedTemplateId === t.id}
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        if (!name.trim()) setName(t.name);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

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
                  setSelectedTemplateId(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

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
            {filtered.length === 0 && search && (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={BrowserIcon} size={24} aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>No pipelines match your search</EmptyTitle>
                  <EmptyDescription>Try a different search term</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {filtered.length === 0 && !search && (
              <div className="flex flex-col items-center gap-6 py-12">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">No pipelines yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get started with a template or create from scratch
                  </p>
                </div>

                {templates.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                    {templates.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          setName(t.name);
                          setCreating(true);
                        }}
                        className="rounded-lg px-4 py-3"
                      />
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreating(true)}
                >
                  Start from scratch
                </Button>
              </div>
            )}

            {filtered.map((p) => (
              <div
                key={p.id}
                data-pipeline-id={p.id}
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
                    <span className="font-mono text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm bg-background w-fit">
                      POST /api/pipelines/{p.id}/runs
                    </span>
                  )}
                </Link>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost" asChild>
                        <Link href={`/pipelines/${p.id}/runs`}>
                          <HugeiconsIcon icon={PlayIcon} size={14} />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Runs</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost" asChild>
                        <Link href={`/pipelines/${p.id}`}>
                          <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost">
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>More actions</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => copyCurl(p.id, "run")}>
                        <HugeiconsIcon icon={copiedId === p.id ? CheckmarkCircle01Icon : Copy01Icon} size={14} />
                        Copy run cURL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyCurl(p.id, "eval-run")}>
                        <HugeiconsIcon icon={copiedId === p.id ? CheckmarkCircle01Icon : Copy01Icon} size={14} />
                        Copy eval run cURL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => e.preventDefault()}
                            disabled={readOnly}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                            Delete
                          </DropdownMenuItem>
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
