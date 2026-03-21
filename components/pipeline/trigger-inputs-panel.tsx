"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";
import { inferSchema } from "@/lib/pipeline/utils/infer-schema";
import type { JsonValue } from "@visual-json/core";

const JsonEditor = dynamic(
  () => import("@visual-json/react").then((m) => m.JsonEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-md bg-muted" />
    ),
  },
);

type ViewMode = "visual" | "raw";

const VJ_THEME = {
  "--vj-bg": "var(--background)",
  "--vj-bg-panel": "transparent",
  "--vj-bg-hover": "var(--accent)",
  "--vj-bg-selected": "var(--primary)",
  "--vj-bg-selected-muted": "var(--accent)",
  "--vj-text": "var(--foreground)",
  "--vj-text-selected": "var(--primary-foreground)",
  "--vj-text-muted": "var(--muted-foreground)",
  "--vj-text-dim": "var(--muted-foreground)",
  "--vj-text-dimmer": "var(--muted-foreground)",
  "--vj-border": "var(--border)",
  "--vj-border-subtle": "var(--border)",
  "--vj-accent": "var(--primary)",
  "--vj-accent-muted": "var(--accent)",
  "--vj-input-bg": "var(--input)",
  "--vj-input-border": "var(--border)",
  "--vj-font": "var(--font-mono)",
  "--vj-input-font-size": "12px",
  "--vj-error": "var(--destructive)",
} as React.CSSProperties;

/** Ensure the value is always a plain object (never an array or primitive). */
function asObject(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function TriggerInputsPanel() {
  const triggerSchema = usePipelineBuilderStore((s) => s.triggerSchema);
  const setTriggerSchema = usePipelineBuilderStore((s) => s.setTriggerSchema);

  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [rawText, setRawText] = useState("");
  const [rawError, setRawError] = useState<string | null>(null);

  const schemaValue = asObject(triggerSchema) as JsonValue;
  const isEmpty = Object.keys(asObject(triggerSchema)).length === 0;

  const handleEditorChange = useCallback(
    (v: JsonValue) => {
      const obj = asObject(v);
      setTriggerSchema(obj);
    },
    [setTriggerSchema],
  );

  function switchToRaw() {
    setRawText(JSON.stringify(asObject(triggerSchema), null, 2));
    setRawError(null);
    setViewMode("raw");
  }

  function switchToVisual() {
    setViewMode("visual");
  }

  function handleRawChange(text: string) {
    setRawText(text);
    try {
      const parsed = JSON.parse(text);
      const obj = asObject(parsed);
      setRawError(null);
      setTriggerSchema(obj);
    } catch {
      setRawError("Invalid JSON");
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) return;
      setTriggerSchema(
        asObject(inferSchema(parsed as Record<string, unknown>)),
      );
    } catch {
      // clipboard denied or invalid JSON — no-op
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      {/* Hide breadcrumbs bar rendered inside FormView */}
      <style>{`
        .vj-no-chrome :has(> [data-form-container]) > :not([data-form-container]) {
          display: none !important;
        }
      `}</style>

      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trigger Inputs
        </h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <button
          onClick={handlePaste}
          title="Paste JSON from clipboard"
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Paste JSON
        </button>

        <div className="ml-auto flex rounded-md border border-border text-[11px]">
          <button
            onClick={switchToVisual}
            className={`rounded-l-md px-2.5 py-0.5 ${
              viewMode === "visual"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Visual
          </button>
          <button
            onClick={switchToRaw}
            className={`rounded-r-md border-l border-border px-2.5 py-0.5 ${
              viewMode === "raw"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {viewMode === "visual" ? (
          <>
            {isEmpty && (
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                Define the JSON shape your pipeline expects when triggered.
                Hover the root and click{" "}
                <strong className="text-foreground">+ Add property</strong> to
                start, or paste a sample payload.
              </p>
            )}

            <div className="vj-no-chrome flex-1 p-2">
              <JsonEditor
                value={schemaValue}
                onChange={handleEditorChange}
                sidebarOpen={false}
                height="100%"
                style={VJ_THEME}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            {rawError && (
              <div className="border-b border-border px-3 py-1.5 text-[11px] text-destructive">
                {rawError}
              </div>
            )}
            <textarea
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none border-none bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              placeholder='{ "prompt": "", "temperature": 0 }'
            />
          </div>
        )}
      </div>
    </aside>
  );
}
