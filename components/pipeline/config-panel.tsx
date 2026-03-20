"use client";

import { useCallback, useEffect, useState } from "react";
import { usePipelineBuilderStore, TRIGGER_NODE_ID } from "@/lib/stores/pipeline-builder";
import { TriggerInputsPanel } from "./trigger-inputs-panel";
import { ModelCombobox } from "./model-combobox";
import { portRegistry } from "@/lib/pipeline/steps/ports";
import type { StepType } from "@/lib/pipeline/types";
import type { GatewayModel } from "@/lib/pipeline/types";
import type {
  ApiRequestConfig,
  AiSdkConfig,
  SandboxConfig,
  ConditionConfig,
  TransformConfig,
  MetricCaptureConfig,
  HumanReviewConfig,
  RubricField,
} from "@/lib/pipeline/types";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Rename a key in a record while preserving insertion order (prevents row reordering in map editors). */
function renameKey<V>(record: Record<string, V>, oldKey: string, newKey: string): Record<string, V> {
  const next: Record<string, V> = {};
  for (const [k, v] of Object.entries(record)) {
    next[k === oldKey ? newKey : k] = v;
  }
  return next;
}

function ApiRequestFields({
  config,
  onUpdate,
}: {
  config: ApiRequestConfig;
  onUpdate: (c: Partial<ApiRequestConfig>) => void;
}) {
  return (
    <>
      <Field label="Method">
        <Select
          value={config.method}
          onChange={(v) => onUpdate({ method: v as ApiRequestConfig["method"] })}
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ]}
        />
      </Field>
      <Field label="URL">
        <Input
          value={config.url}
          onChange={(v) => onUpdate({ url: v })}
          placeholder="https://api.example.com or trigger.url"
        />
      </Field>
      <Field label="Body Template (key → dot-path)">
        <div className="flex flex-col gap-1">
          {Object.entries(config.bodyTemplate ?? {}).map(([key, val], i) => (
            <div key={i} className="flex gap-1">
              <Input
                value={key}
                onChange={(v) => onUpdate({ bodyTemplate: renameKey(config.bodyTemplate ?? {}, key, v) })}
                placeholder="field_name"
              />
              <Input
                value={String(val ?? "")}
                onChange={(v) =>
                  onUpdate({ bodyTemplate: { ...config.bodyTemplate, [key]: v } })
                }
                placeholder="steps.node.field"
              />
              <button
                type="button"
                onClick={() => {
                  const next = { ...config.bodyTemplate };
                  delete next[key];
                  onUpdate({ bodyTemplate: next });
                }}
                className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ bodyTemplate: { ...config.bodyTemplate, "": "" } })}
            disabled={"" in (config.bodyTemplate ?? {})}
            className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            + Add field
          </button>
        </div>
      </Field>
    </>
  );
}

let modelsCache: Promise<{ models: GatewayModel[]; fallback?: boolean }> | null = null;

function fetchModels(): Promise<{ models: GatewayModel[]; fallback?: boolean }> {
  if (!modelsCache) {
    modelsCache = fetch("/api/models")
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((d) => ({
        models: (d.models ?? []) as GatewayModel[],
        fallback: d.fallback === true,
      }))
      .catch(() => ({ models: [] }));
  }
  return modelsCache;
}

function useModels(): { models: GatewayModel[]; fallback?: boolean } {
  const [state, setState] = useState<{
    models: GatewayModel[];
    fallback?: boolean;
  }>({ models: [] });
  useEffect(() => {
    fetchModels().then(setState);
  }, []);
  return state;
}

function AiSdkFields({
  config,
  onUpdate,
}: {
  config: AiSdkConfig;
  onUpdate: (c: Partial<AiSdkConfig>) => void;
}) {
  const { models, fallback } = useModels();

  return (
    <>
      <Field label="Model">
        <ModelCombobox
          models={models}
          value={config.model}
          onValueChange={(v) => onUpdate({ model: v })}
          hint={fallback ? "Add AI_GATEWAY_API_KEY for account-specific availability." : undefined}
        />
      </Field>
      <Field label="Prompt Template">
        <Textarea
          value={config.promptTemplate}
          onChange={(v) => onUpdate({ promptTemplate: v })}
          placeholder="Evaluate the following: {{steps.fetch.body.text}}"
          rows={4}
        />
      </Field>
      <Field label="Temperature">
        <Input
          type="number"
          value={config.temperature ?? 0.7}
          onChange={(v) => onUpdate({ temperature: parseFloat(v) || 0 })}
        />
      </Field>
      <Field label="Max Tokens">
        <Input
          type="number"
          value={config.maxTokens ?? ""}
          onChange={(v) => onUpdate({ maxTokens: v ? parseInt(v) : undefined })}
          placeholder="Optional"
        />
      </Field>
    </>
  );
}

function SandboxFields({
  config,
  onUpdate,
}: {
  config: SandboxConfig;
  onUpdate: (c: Partial<SandboxConfig>) => void;
}) {
  return (
    <>
      <Field label="Runtime">
        <Select
          value={config.runtime}
          onChange={(v) => onUpdate({ runtime: v as "node" | "python" })}
          options={[
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
          ]}
        />
      </Field>
      <Field label="Code">
        <Textarea
          value={config.code}
          onChange={(v) => onUpdate({ code: v })}
          placeholder="module.exports = async (input) => { ... }"
          rows={6}
        />
      </Field>
      <Field label="Timeout (ms)">
        <Input
          type="number"
          value={config.timeout}
          onChange={(v) => onUpdate({ timeout: parseInt(v) || 30000 })}
        />
      </Field>
    </>
  );
}

function ConditionFields({
  config,
  onUpdate,
}: {
  config: ConditionConfig;
  onUpdate: (c: Partial<ConditionConfig>) => void;
}) {
  return (
    <>
      <Field label="Expression">
        <Input
          value={config.expression}
          onChange={(v) => onUpdate({ expression: v })}
          placeholder="steps.score.value > 0.8"
        />
      </Field>
      <Field label="Output Handles">
        <div className="flex flex-col gap-1">
          {config.handles.map((h, i) => (
            <div key={i} className="flex gap-1">
              <Input
                value={h}
                onChange={(v) => {
                  const next = [...config.handles];
                  next[i] = v;
                  onUpdate({ handles: next });
                }}
              />
              {config.handles.length > 2 && (
                <button
                  onClick={() =>
                    onUpdate({ handles: config.handles.filter((_, j) => j !== i) })
                  }
                  className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ handles: [...config.handles, `branch_${config.handles.length}`] })}
            className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            + Add handle
          </button>
        </div>
      </Field>
    </>
  );
}

function TransformFields({
  config,
  onUpdate,
}: {
  config: TransformConfig;
  onUpdate: (c: Partial<TransformConfig>) => void;
}) {
  const entries = Object.entries(config.mapping);

  return (
    <Field label="Mapping (key → dot-path)">
      <div className="flex flex-col gap-1">
        {entries.map(([key, path], i) => (
          <div key={i} className="flex gap-1">
            <Input
              value={key}
              onChange={(v) => onUpdate({ mapping: renameKey(config.mapping, key, v) })}
              placeholder="output_key"
            />
            <Input
              value={path}
              onChange={(v) => onUpdate({ mapping: { ...config.mapping, [key]: v } })}
              placeholder="steps.node.field"
            />
            <button
              onClick={() => {
                const next = { ...config.mapping };
                delete next[key];
                onUpdate({ mapping: next });
              }}
              className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => onUpdate({ mapping: { ...config.mapping, "": "" } })}
          disabled={"" in config.mapping}
          className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
        >
          + Add mapping
        </button>
      </div>
    </Field>
  );
}

function MetricCaptureFields({
  config,
  onUpdate,
}: {
  config: MetricCaptureConfig;
  onUpdate: (c: Partial<MetricCaptureConfig>) => void;
}) {
  const entries = Object.entries(config.metrics);

  return (
    <Field label="Metrics (name → dot-path)">
      <div className="flex flex-col gap-1">
        {entries.map(([key, path], i) => (
          <div key={i} className="flex gap-1">
            <Input
              value={key}
              onChange={(v) => onUpdate({ metrics: renameKey(config.metrics, key, v) })}
              placeholder="accuracy"
            />
            <Input
              value={path}
              onChange={(v) => onUpdate({ metrics: { ...config.metrics, [key]: v } })}
              placeholder="steps.eval.score"
            />
            <button
              onClick={() => {
                const next = { ...config.metrics };
                delete next[key];
                onUpdate({ metrics: next });
              }}
              className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => onUpdate({ metrics: { ...config.metrics, "": "" } })}
          disabled={"" in config.metrics}
          className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
        >
          + Add metric
        </button>
      </div>
    </Field>
  );
}

function HumanReviewFields({
  config,
  onUpdate,
}: {
  config: HumanReviewConfig;
  onUpdate: (c: Partial<HumanReviewConfig>) => void;
}) {
  const rubric = config.rubric ?? [];

  function updateRubricField(index: number, patch: Partial<RubricField>) {
    const next = [...rubric];
    next[index] = { ...next[index], ...patch } as RubricField;
    onUpdate({ rubric: next });
  }

  function removeRubricField(index: number) {
    onUpdate({ rubric: rubric.filter((_, i) => i !== index) });
  }

  function addRubricField() {
    onUpdate({
      rubric: [...rubric, { name: "", type: "rating", min: 1, max: 5 }],
    });
  }

  return (
    <>
      {/* Display Data */}
      <Field label="Display Data (label → dot-path)">
        <div className="flex flex-col gap-1">
          {Object.entries(config.display ?? {}).map(([key, path], i) => (
            <div key={i} className="flex gap-1">
              <Input
                value={key}
                onChange={(v) =>
                  onUpdate({ display: renameKey(config.display ?? {}, key, v) })
                }
                placeholder="Label"
              />
              <Input
                value={path}
                onChange={(v) =>
                  onUpdate({ display: { ...config.display, [key]: v } })
                }
                placeholder="steps.llm.text"
              />
              <button
                type="button"
                onClick={() => {
                  const next = { ...config.display };
                  delete next[key];
                  onUpdate({ display: next });
                }}
                className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onUpdate({ display: { ...config.display, "": "" } })
            }
            disabled={"" in (config.display ?? {})}
            className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            + Add display field
          </button>
        </div>
      </Field>

      {/* Rubric */}
      <Field label="Rubric">
        <div className="flex flex-col gap-2">
          {rubric.map((field, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-md border border-border p-2">
              <div className="flex gap-1">
                <Input
                  value={field.name}
                  onChange={(v) => updateRubricField(i, { name: v })}
                  placeholder="field_name"
                />
                <Select
                  value={field.type}
                  onChange={(v) => {
                    const base = { name: field.name };
                    if (v === "rating")
                      onUpdate({
                        rubric: rubric.map((f, j) =>
                          j === i ? { ...base, type: "rating", min: 1, max: 5 } : f,
                        ),
                      });
                    else if (v === "boolean")
                      onUpdate({
                        rubric: rubric.map((f, j) =>
                          j === i ? { ...base, type: "boolean", label: field.name } : f,
                        ),
                      });
                    else if (v === "text")
                      onUpdate({
                        rubric: rubric.map((f, j) =>
                          j === i ? { ...base, type: "text" } : f,
                        ),
                      });
                    else if (v === "select")
                      onUpdate({
                        rubric: rubric.map((f, j) =>
                          j === i ? { ...base, type: "select", options: [] } : f,
                        ),
                      });
                  }}
                  options={[
                    { value: "rating", label: "Rating" },
                    { value: "boolean", label: "Boolean" },
                    { value: "text", label: "Text" },
                    { value: "select", label: "Select" },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => removeRubricField(i)}
                  className="shrink-0 rounded-md px-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  ×
                </button>
              </div>
              {field.type === "rating" && (
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={field.min}
                    onChange={(v) => updateRubricField(i, { min: parseInt(v) || 1 })}
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    value={field.max}
                    onChange={(v) => updateRubricField(i, { max: parseInt(v) || 5 })}
                    placeholder="Max"
                  />
                </div>
              )}
              {field.type === "select" && (
                <Input
                  value={field.options.join(", ")}
                  onChange={(v) =>
                    updateRubricField(i, {
                      options: v.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="option1, option2, option3"
                />
              )}
              {field.type === "text" && (
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(v) => updateRubricField(i, { placeholder: v || undefined })}
                  placeholder="Placeholder text (optional)"
                />
              )}
              {field.type === "boolean" && (
                <Input
                  value={field.label}
                  onChange={(v) => updateRubricField(i, { label: v })}
                  placeholder="Question label"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addRubricField}
            className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            + Add rubric field
          </button>
        </div>
      </Field>

      {/* Required Reviewers */}
      <Field label="Required Reviewers">
        <Input
          type="number"
          value={config.requiredReviewers ?? 1}
          onChange={(v) =>
            onUpdate({ requiredReviewers: Math.max(1, parseInt(v) || 1) })
          }
        />
      </Field>
    </>
  );
}

function SlugField({
  node,
  nodes,
  onSlugChange,
}: {
  node: { id: string; type?: string; data: { slug: string | null } };
  nodes: { id: string; data: { slug: string | null } }[];
  onSlugChange: (slug: string) => void;
}) {
  const slug = node.data.slug ?? "";
  const isDuplicate =
    slug !== "" &&
    nodes.some((n) => n.id !== node.id && n.data.slug === slug);

  const ports = node.type ? portRegistry[node.type as StepType] : null;
  const primaryOutputKey = ports?.outputs[0]?.key;

  return (
    <>
      <Field label="Slug">
        <Input
          value={slug}
          onChange={onSlugChange}
          placeholder="auto-derived from label"
        />
        {isDuplicate && (
          <p className="mt-0.5 text-[10px] text-destructive">
            Duplicate slug &mdash; another node already uses &ldquo;{slug}&rdquo;
          </p>
        )}
      </Field>
      {slug && primaryOutputKey && (
        <p className="-mt-2 text-[10px] text-muted-foreground">
          Reference as: <code className="text-[10px]">steps.{slug}.{primaryOutputKey}</code>
        </p>
      )}
    </>
  );
}

export function ConfigPanel() {
  const selectedNodeId = usePipelineBuilderStore((s) => s.selectedNodeId);
  const nodes = usePipelineBuilderStore((s) => s.nodes);
  const updateNodeConfig = usePipelineBuilderStore((s) => s.updateNodeConfig);
  const updateNodeLabel = usePipelineBuilderStore((s) => s.updateNodeLabel);
  const updateNodeSlug = usePipelineBuilderStore((s) => s.updateNodeSlug);

  const node = nodes.find((n) => n.id === selectedNodeId);

  const onUpdate = useCallback(
    (partial: Record<string, unknown>) => {
      if (!node) return;
      updateNodeConfig(node.id, { ...node.data.config, ...partial });
    },
    [node, updateNodeConfig],
  );

  if (!node || node.id === TRIGGER_NODE_ID) {
    return <TriggerInputsPanel />;
  }

  const config = node.data.config as Record<string, unknown>;
  const type = node.type!;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configure
        </h2>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-4">
        <Field label="Label">
          <Input
            value={node.data.label ?? ""}
            onChange={(v) => updateNodeLabel(node.id, v)}
            placeholder="Node label"
          />
        </Field>

        <SlugField
          node={node}
          nodes={nodes}
          onSlugChange={(v) => updateNodeSlug(node.id, v)}
        />

        {type === "api_request" && (
          <ApiRequestFields config={config as unknown as ApiRequestConfig} onUpdate={onUpdate} />
        )}
        {type === "ai_sdk" && (
          <AiSdkFields config={config as unknown as AiSdkConfig} onUpdate={onUpdate} />
        )}
        {type === "sandbox" && (
          <SandboxFields config={config as unknown as SandboxConfig} onUpdate={onUpdate} />
        )}
        {type === "condition" && (
          <ConditionFields config={config as unknown as ConditionConfig} onUpdate={onUpdate} />
        )}
        {type === "transform" && (
          <TransformFields config={config as unknown as TransformConfig} onUpdate={onUpdate} />
        )}
        {type === "metric_capture" && (
          <MetricCaptureFields config={config as unknown as MetricCaptureConfig} onUpdate={onUpdate} />
        )}
        {type === "human_review" && (
          <HumanReviewFields config={config as unknown as HumanReviewConfig} onUpdate={onUpdate} />
        )}
      </div>
    </aside>
  );
}
