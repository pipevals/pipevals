"use client";

import { useCallback } from "react";
import { usePipelineBuilderStore, TRIGGER_NODE_ID } from "@/lib/stores/pipeline-builder";
import { TriggerInputsPanel } from "./trigger-inputs-panel";
import type {
  ApiRequestConfig,
  AiSdkConfig,
  SandboxConfig,
  ConditionConfig,
  TransformConfig,
  MetricCaptureConfig,
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
      <Field label="Body Template (JSON)">
        <Textarea
          value={config.bodyTemplate ? JSON.stringify(config.bodyTemplate, null, 2) : ""}
          onChange={(v) => {
            try { onUpdate({ bodyTemplate: JSON.parse(v) }); } catch {}
          }}
          placeholder='{ "text": "steps.llm.response" }'
          rows={4}
        />
      </Field>
    </>
  );
}

function AiSdkFields({
  config,
  onUpdate,
}: {
  config: AiSdkConfig;
  onUpdate: (c: Partial<AiSdkConfig>) => void;
}) {
  return (
    <>
      <Field label="Model">
        <Input
          value={config.model}
          onChange={(v) => onUpdate({ model: v })}
          placeholder="openai/gpt-4o"
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
              onChange={(v) => {
                const next = { ...config.mapping };
                delete next[key];
                next[v] = path;
                onUpdate({ mapping: next });
              }}
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
          className="h-7 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
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
  return (
    <>
      <Field label="Metric Name">
        <Input
          value={config.metricName}
          onChange={(v) => onUpdate({ metricName: v })}
          placeholder="accuracy"
        />
      </Field>
      <Field label="Extract Path">
        <Input
          value={config.extractPath}
          onChange={(v) => onUpdate({ extractPath: v })}
          placeholder="steps.eval.score"
        />
      </Field>
    </>
  );
}

export function ConfigPanel() {
  const selectedNodeId = usePipelineBuilderStore((s) => s.selectedNodeId);
  const nodes = usePipelineBuilderStore((s) => s.nodes);
  const updateNodeConfig = usePipelineBuilderStore((s) => s.updateNodeConfig);
  const updateNodeLabel = usePipelineBuilderStore((s) => s.updateNodeLabel);

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
      </div>
    </aside>
  );
}
