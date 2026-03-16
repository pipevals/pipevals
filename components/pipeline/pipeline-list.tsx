"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import type { PipelineSummary } from "@/lib/api/pipelines";

interface PipelineListProps {
  initialPipelines: PipelineSummary[];
}

export function PipelineList({ initialPipelines }: PipelineListProps) {
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const [createController, setCreateController] = useState<AbortController | null>(null);

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
        setError(data.error ?? "Failed to create pipeline");
        return;
      }
      setName("");
      setCreating(false);
      await fetchPipelines();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Failed to create pipeline");
    } finally {
      setCreateController(null);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchPipelines();
    } catch {
      setError("Failed to delete pipeline");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!creating ? (
        <div>
          <Button onClick={() => setCreating(true)}>New Pipeline</Button>
        </div>
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Create Pipeline</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
              placeholder="Pipeline name"
              className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
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
        </Card>
      )}

      {error && !creating ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/50 py-16">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="ghost" onClick={() => fetchPipelines()}>
            Retry
          </Button>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">No pipelines yet</p>
          <p className="text-xs text-muted-foreground">
            Create one to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pipelines.map((p) => (
            <Card key={p.id} size="sm">
              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/pipelines/${p.id}`}
                    className="hover:underline"
                  >
                    {p.name}
                  </Link>
                </CardTitle>
                {p.description && (
                  <CardDescription>{p.description}</CardDescription>
                )}
                <CardAction>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/pipelines/${p.id}`}>Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
